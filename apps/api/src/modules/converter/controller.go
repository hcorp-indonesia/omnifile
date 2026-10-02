package converter

import (
	"math"
	"strconv"

	"magic-converter/src/middleware"
	"magic-converter/src/utils"

	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
)

type ConverterController struct {
	service *ConverterService
}

func NewConverterController(service *ConverterService) *ConverterController {
	return &ConverterController{service: service}
}

func (c *ConverterController) Create(ctx fiber.Ctx) error {
	var req CreateConverterRequest
	if err := ctx.Bind().Body(&req); err != nil {
		return err
	}

	if err := middleware.ValidateStruct(&req); err != nil {
		return err
	}

	image, _ := ctx.FormFile("image")

	_, err := c.service.Create(ctx.Context(), &req, image)
	if err != nil {
		return err
	}

	return utils.RespondSuccess(ctx, "Converter created", nil)
}

func (c *ConverterController) List(ctx fiber.Ctx) error {
	page, _ := strconv.Atoi(ctx.Query("page", "1"))
	perPage, _ := strconv.Atoi(ctx.Query("per_page", "10"))

	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 10
	}

	converters, total, err := c.service.List(ctx.Context(), page, perPage)
	if err != nil {
		return err
	}

	pages := int(math.Ceil(float64(total) / float64(perPage)))

	var response []ConverterListItemResponse
	for _, conv := range converters {
		response = append(response, c.mapToListItemResponse(conv))
	}

	return utils.RespondSuccessWithMeta(ctx, "Converters retrieved", response, &utils.Metadata{
		TotalRow:    total,
		CurrentPage: page,
		PerPage:     perPage,
		TotalPage:   pages,
	})
}

func (c *ConverterController) Get(ctx fiber.Ctx) error {
	idParam := ctx.Params("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		return utils.ErrBadRequest("Invalid converter ID")
	}

	conv, err := c.service.GetByID(ctx.Context(), id)
	if err != nil {
		return err
	}

	return utils.RespondSuccess(ctx, "Converter retrieved", c.mapToDetailResponse(conv))
}

func (c *ConverterController) Update(ctx fiber.Ctx) error {
	idParam := ctx.Params("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		return utils.ErrBadRequest("Invalid converter ID")
	}

	var req UpdateConverterRequest
	if err := ctx.Bind().Body(&req); err != nil {
		return err
	}

	image, _ := ctx.FormFile("image")

	_, err = c.service.Update(ctx.Context(), id, &req, image)
	if err != nil {
		return err
	}

	return utils.RespondSuccess(ctx, "Converter updated", nil)
}

func (c *ConverterController) Delete(ctx fiber.Ctx) error {
	idParam := ctx.Params("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		return utils.ErrBadRequest("Invalid converter ID")
	}

	if err := c.service.Delete(ctx.Context(), id); err != nil {
		return err
	}

	return utils.RespondSuccess(ctx, "Converter deleted", nil)
}

func (c *ConverterController) mapToListItemResponse(conv *Converter) ConverterListItemResponse {
	return ConverterListItemResponse{
		ID:       conv.ID,
		Name:     conv.Name,
		FromUnit: conv.FromUnit,
		ToUnit:   conv.ToUnit,
		Category: conv.Category,
		IsActive: conv.IsActive,
		ImageURL: conv.ImageURL,
	}
}

func (c *ConverterController) mapToDetailResponse(conv *Converter) ConverterDetailResponse {
	return ConverterDetailResponse{
		ID:          conv.ID,
		Name:        conv.Name,
		Description: conv.Description,
		FromUnit:    conv.FromUnit,
		ToUnit:      conv.ToUnit,
		Formula:     conv.Formula,
		Category:    conv.Category,
		IsActive:    conv.IsActive,
		ImageURL:    conv.ImageURL,
	}
}
