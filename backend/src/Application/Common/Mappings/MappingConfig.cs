using QorstackReportService.Application.ExampleCategories.GetExampleCategoriesWithPagination;
using QorstackReportService.Application.ExampleProducts.GetExampleProductsWithPagination;
using QorstackReportService.Domain.Entities;

namespace QorstackReportService.Application.Common.Mappings;

public class MappingConfig : IRegister
{
    public void Register(TypeAdapterConfig config)
    {
        config.NewConfig<ExampleProduct, ExampleProductDto>()
            .Map(dest => dest.CategoryName, src => src.Category != null ? src.Category.Name : string.Empty);

        config.NewConfig<ExampleCategory, ExampleCategoryDto>();
    }
}
