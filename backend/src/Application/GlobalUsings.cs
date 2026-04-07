global using Ardalis.GuardClauses;
global using Mapster;
global using QorstackReportService.Application.Common.Security;
global using QorstackReportService.Domain.Constants;
global using FluentValidation;
global using MediatR;
global using Microsoft.AspNetCore.Http;
global using Microsoft.EntityFrameworkCore;
global using Microsoft.Extensions.Configuration;

// Aliased to avoid conflicts
global using ValidationException = QorstackReportService.Application.Common.Exceptions.ValidationException;
global using NotFoundException = QorstackReportService.Application.Common.Exceptions.NotFoundException;
