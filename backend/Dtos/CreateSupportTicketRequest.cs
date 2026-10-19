using System.ComponentModel.DataAnnotations;

namespace backend.Dtos;

public sealed class CreateSupportTicketRequest
{
    private string? _title;
    private string? _description;

    [Required(ErrorMessage = "Укажите тему заявки.")]
    [StringLength(80, MinimumLength = 5, ErrorMessage = "Тема: от 5 до 80 символов.")]
    public string? Title
    {
        get => _title;
        set => _title = value?.Trim();
    }

    [Range(1, int.MaxValue, ErrorMessage = "equipmentId должен быть положительным целым числом.")]
    public int EquipmentId { get; set; }

    [Required(ErrorMessage = "Укажите описание проблемы.")]
    [StringLength(500, MinimumLength = 10, ErrorMessage = "Описание: от 10 до 500 символов.")]
    public string? Description
    {
        get => _description;
        set => _description = value?.Trim();
    }
}
