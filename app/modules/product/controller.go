package product

import (
	"math"
	"strconv"

	"gofiber-starterkit/app/shared"
	"gofiber-starterkit/pkg/middlewares"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
)

type ProductController struct {
	service *ProductService
}

func NewProductController(service *ProductService) *ProductController {
	return &ProductController{service: service}
}

func (c *ProductController) Create(ctx fiber.Ctx) error {
	var req CreateProductRequest
	if err := ctx.Bind().Body(&req); err != nil {
		return err
	}

	if err := middlewares.ValidateStruct(&req); err != nil {
		return err
	}

	image, _ := ctx.FormFile("image")

	_, err := c.service.Create(ctx.Context(), &req, image)
	if err != nil {
		return err
	}

	return shared.RespondSuccess(ctx, "Product created", nil)
}

func (c *ProductController) List(ctx fiber.Ctx) error {
	page, _ := strconv.Atoi(ctx.Query("page", "1"))
	perPage, _ := strconv.Atoi(ctx.Query("per_page", "10"))

	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 10
	}

	products, total, err := c.service.List(ctx.Context(), page, perPage)
	if err != nil {
		return err
	}

	pages := int(math.Ceil(float64(total) / float64(perPage)))

	var response []ProductListItemResponse
	for _, p := range products {
		response = append(response, c.mapToListItemResponse(p))
	}

	return shared.RespondSuccessWithMeta(ctx, "Products retrieved", response, &shared.Metadata{
		TotalRow:    total,
		CurrentPage: page,
		PerPage:     perPage,
		TotalPage:   pages,
	})
}

func (c *ProductController) Get(ctx fiber.Ctx) error {
	idParam := ctx.Params("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		return shared.ErrBadRequest("Invalid product ID")
	}

	product, err := c.service.GetByID(ctx.Context(), id)
	if err != nil {
		return err
	}

	return shared.RespondSuccess(ctx, "Product retrieved", c.mapToDetailResponse(product))
}

func (c *ProductController) Update(ctx fiber.Ctx) error {
	idParam := ctx.Params("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		return shared.ErrBadRequest("Invalid product ID")
	}

	var req UpdateProductRequest
	if err := ctx.Bind().Body(&req); err != nil {
		return err
	}

	image, _ := ctx.FormFile("image")

	_, err = c.service.Update(ctx.Context(), id, &req, image)
	if err != nil {
		return err
	}

	return shared.RespondSuccess(ctx, "Product updated", nil)
}

func (c *ProductController) UpdateStatus(ctx fiber.Ctx) error {
	idParam := ctx.Params("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		return shared.ErrBadRequest("Invalid product ID")
	}

	if err := c.service.UpdateStatus(ctx.Context(), id); err != nil {
		return err
	}

	return shared.RespondSuccess(ctx, "Product status toggled", nil)
}

func (c *ProductController) Delete(ctx fiber.Ctx) error {
	idParam := ctx.Params("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		return shared.ErrBadRequest("Invalid product ID")
	}

	if err := c.service.Delete(ctx.Context(), id); err != nil {
		return err
	}

	return shared.RespondSuccess(ctx, "Product deleted", nil)
}

func (c *ProductController) mapToListItemResponse(p *Product) ProductListItemResponse {
	return ProductListItemResponse{
		ID:       p.ID,
		Name:     p.Name,
		Price:    p.Price,
		Status:   p.Status,
		ImageURL: p.ImageURL,
	}
}

func (c *ProductController) mapToDetailResponse(p *Product) ProductDetailResponse {
	return ProductDetailResponse{
		ID:          p.ID,
		Name:        p.Name,
		Description: p.Description,
		Price:       p.Price,
		Stock:       p.Stock,
		Status:      p.Status,
		ImageURL:    p.ImageURL,
	}
}
