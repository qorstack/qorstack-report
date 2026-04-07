using MediatR;
using Microsoft.AspNetCore.Mvc;
using QorstackReportService.Application.Users.Commands.CreateApiKey;
using QorstackReportService.Application.Users.Commands.CreateUser;
using QorstackReportService.Application.Users.Commands.RevokeApiKey;
using QorstackReportService.Application.Users.Queries.GetApiKeysByUserId;
using QorstackReportService.Application.Users.Queries.GetUserById;
using QorstackReportService.Application.Users.Queries.GetUsers;
using QorstackReportService.Application.Common.Interfaces;
using QorstackReportService.Application.Common.Models;
using QorstackReportService.Application.DTOs;
using QorstackReportService.Web.Infrastructure;

namespace QorstackReportService.Web.Endpoints;

/// <summary>
/// API endpoints for user management (Admin)
/// </summary>
public class Users : EndpointGroupBase
{
    public override void Map(WebApplication app)
    {
        // Note: In production, these endpoints should be protected by admin authentication
        // For now, they are open for initial setup purposes
        var group = app.MapGroup("/users")
            .WithTags("Users")
            .RequireAuthorization();

        group.MapPost("/", Create)
            .Produces<CreateUserResponse>(StatusCodes.Status201Created)
            .ProducesProblem(StatusCodes.Status400BadRequest);

        group.MapGet("/", GetAll)
            .Produces<PaginatedList<UserDto>>(StatusCodes.Status200OK);

        group.MapGet("/{id:guid}", GetById)
            .WithName("GetUserById")
            .Produces<UserDto>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapPut("/{id:guid}", Update)
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapPost("/{id:guid}/api-keys", CreateApiKey)
            .Produces<CreateApiKeyResponse>(StatusCodes.Status201Created)
            .ProducesProblem(StatusCodes.Status400BadRequest)
            .ProducesProblem(StatusCodes.Status404NotFound);

        group.MapGet("/{id:guid}/api-keys", GetApiKeys)
            .Produces<List<ApiKeyDto>>(StatusCodes.Status200OK)
            .ProducesProblem(StatusCodes.Status404NotFound);

        // Separate endpoint for revoking API keys
        app.MapDelete("/api-keys/{id:guid}", RevokeApiKey)
            .Produces(StatusCodes.Status204NoContent)
            .ProducesProblem(StatusCodes.Status404NotFound);
    }

    /// <summary>
    /// Create a new user
    /// </summary>
    private static async Task<IResult> Create(ISender sender, [FromBody] CreateUserRequest request)
    {
        var command = new CreateUserCommand
        {
            Email = request.Email,
            Password = request.Password,
            FirstName = request.FirstName,
            LastName = request.LastName,
            Status = request.Status ?? "active"
        };

        var id = await sender.Send(command);
        return Results.Created($"/users/{id}", new CreateUserResponse { Id = id });
    }

    /// <summary>
    /// Get all users with pagination
    /// </summary>
    private static async Task<IResult> GetAll(
        ISender sender,
        [FromQuery] string? status,
        [FromQuery] string? search,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10)
    {
        var query = new GetUsersQuery
        {
            Status = status,
            SearchEmail = search,
            PageNumber = pageNumber,
            PageSize = pageSize
        };

        var result = await sender.Send(query);
        return Results.Ok(result);
    }

    /// <summary>
    /// Get a user by ID
    /// </summary>
    private static async Task<IResult> GetById(ISender sender, Guid id)
    {
        var query = new GetUserByIdQuery { Id = id };
        var result = await sender.Send(query);
        return result is not null ? Results.Ok(result) : Results.NotFound();
    }

    /// <summary>
    /// Update a user
    /// </summary>
    private static async Task<IResult> Update(
        IApplicationDbContext dbContext,
        Guid id,
        [FromBody] UpdateUserRequest request)
    {
        var user = await dbContext.Users.FindAsync(id);
        if (user == null)
        {
            return Results.NotFound();
        }

        if (!string.IsNullOrWhiteSpace(request.Email))
        {
            user.Email = request.Email;
        }

        if (!string.IsNullOrWhiteSpace(request.FirstName))
        {
            user.FirstName = request.FirstName;
        }

        if (!string.IsNullOrWhiteSpace(request.LastName))
        {
            user.LastName = request.LastName;
        }

        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            user.Status = request.Status.ToLowerInvariant();
        }

        user.UpdatedDatetime = DateTime.UtcNow;
        await dbContext.SaveChangesAsync(CancellationToken.None);

        return Results.NoContent();
    }

    /// <summary>
    /// Create an API key for a user
    /// </summary>
    private static async Task<IResult> CreateApiKey(ISender sender, Guid id, [FromBody] CreateApiKeyRequest request)
    {
        var command = new CreateApiKeyCommand
        {
            UserId = id,
            Name = request.Name,
            QuotaPerDay = request.QuotaPerDay
        };

        var result = await sender.Send(command);
        return Results.Created($"/users/{id}/api-keys", new CreateApiKeyResponse
        {
            Id = result.Id,
            ApiKey = result.ApiKey
        });
    }

    /// <summary>
    /// Get API keys for a user
    /// </summary>
    private static async Task<IResult> GetApiKeys(ISender sender, Guid id)
    {
        var query = new GetApiKeysByUserIdQuery { UserId = id };
        var result = await sender.Send(query);
        return Results.Ok(result);
    }

    /// <summary>
    /// Revoke an API key
    /// </summary>
    private static async Task<IResult> RevokeApiKey(ISender sender, Guid id)
    {
        var command = new RevokeApiKeyCommand { Id = id };
        await sender.Send(command);
        return Results.NoContent();
    }
}

/// <summary>
/// Request for creating a user
/// </summary>
public class CreateUserRequest
{
    public required string Email { get; set; }
    public required string Password { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Status { get; set; }
}

/// <summary>
/// Response for creating a user
/// </summary>
public class CreateUserResponse
{
    public Guid Id { get; set; }
}

/// <summary>
/// Request for updating a user
/// </summary>
public class UpdateUserRequest
{
    public string? Email { get; set; }
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    public string? Status { get; set; }
}

/// <summary>
/// Request for creating an API key
/// </summary>
public class CreateApiKeyRequest
{
    public string? Name { get; set; }
    public int? QuotaPerDay { get; set; }
}

/// <summary>
/// Response for creating an API key
/// </summary>
public class CreateApiKeyResponse
{
    public Guid Id { get; set; }
    public required string ApiKey { get; set; }
}
