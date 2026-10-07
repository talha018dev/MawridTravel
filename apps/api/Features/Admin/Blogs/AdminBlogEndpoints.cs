namespace MawridTravel.Api.Features.Admin.Blogs;

internal static class AdminBlogEndpoints
{
    public static RouteGroupBuilder MapAdminBlogEndpoints(this RouteGroupBuilder adminGroup)
    {
        var group = adminGroup.MapGroup("/blogs");

        group.MapGet("/", BlogHandlers.GetBlogsAsync)
            .WithName("GetAdminBlogs");
        group.MapGet("/{id:guid}", BlogHandlers.GetBlogAsync)
            .WithName("GetAdminBlog");
        group.MapPost("/", BlogHandlers.CreateBlogAsync)
            .WithName("CreateBlog");
        group.MapPut("/{id:guid}", BlogHandlers.UpdateBlogAsync)
            .WithName("UpdateBlog");
        group.MapDelete("/{id:guid}", BlogHandlers.DeleteBlogAsync)
            .WithName("DeleteBlog")
            .Produces(StatusCodes.Status204NoContent)
            .Produces(StatusCodes.Status401Unauthorized)
            .Produces(StatusCodes.Status403Forbidden)
            .Produces(StatusCodes.Status404NotFound);

        return adminGroup;
    }
}
