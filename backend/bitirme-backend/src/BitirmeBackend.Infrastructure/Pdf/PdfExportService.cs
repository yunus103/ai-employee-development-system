using BitirmeBackend.Application.Interfaces.Repositories;
using BitirmeBackend.Application.Interfaces.Services;
using BitirmeBackend.Domain.Entities;
using BitirmeBackend.Domain.Enums;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace BitirmeBackend.Infrastructure.Pdf;

public class PdfExportService : IPdfExportService
{
    static PdfExportService()
    {
        // Community license — must be set once before any PDF is generated
        QuestPDF.Settings.License = QuestPDF.Infrastructure.LicenseType.Community;
    }

    private readonly IActionPlanRepository _actionPlans;
    private readonly IAssessmentRepository _assessments;
    private readonly IEmployeeTaskRepository _employeeTasks;

    public PdfExportService(
        IActionPlanRepository actionPlans,
        IAssessmentRepository assessments,
        IEmployeeTaskRepository employeeTasks)
    {
        _actionPlans   = actionPlans;
        _assessments   = assessments;
        _employeeTasks = employeeTasks;
    }

    public async Task<byte[]> GenerateActionPlanPdfAsync(int actionPlanId)
    {
        // 1. Load plan + items
        var plan = await _actionPlans.GetByIdWithItemsAsync(actionPlanId)
            ?? throw new KeyNotFoundException($"Aksiyon planı bulunamadı: {actionPlanId}");

        // 2. Load assessment (for cycle name)
        var assessment = await _assessments.GetByIdWithDetailsAsync(plan.AssessmentId);

        // 3. Active items only
        var items = plan.Items.Where(i => !i.IsDeleted).OrderBy(i => i.OrderNo).ToList();

        // 4. Load EmployeeTasks for each item
        var taskMap = new Dictionary<int, EmployeeTask?>();
        foreach (var item in items)
        {
            var tasks = (await _employeeTasks.GetByActionPlanItemIdAsync(item.Id)).ToList();
            taskMap[item.Id] = tasks.FirstOrDefault();
        }

        // 5. Generate PDF
        var employee   = plan.Employee;
        var department = employee?.Department?.Name ?? "-";
        var jobRole    = employee?.JobRole?.Name    ?? "-";
        var cycleName  = assessment?.Cycle?.Name    ?? $"Değerlendirme #{plan.AssessmentId}";

        var pdfBytes = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.Margin(2, Unit.Centimetre);
                page.DefaultTextStyle(t => t.FontFamily("Noto Sans").FontSize(10));

                // ── HEADER ──────────────────────────────────────────────────
                page.Header().Column(col =>
                {
                    col.Item().Text("Aksiyon Planı")
                        .FontSize(20).Bold().FontColor(Colors.Blue.Darken2);

                    col.Item().PaddingTop(6).Table(tbl =>
                    {
                        tbl.ColumnsDefinition(c =>
                        {
                            c.RelativeColumn();
                            c.RelativeColumn();
                        });

                        void InfoRow(string label, string value)
                        {
                            tbl.Cell().Text(label).Bold();
                            tbl.Cell().Text(value);
                        }

                        InfoRow("Çalışan:",        employee?.FullName     ?? "-");
                        InfoRow("Departman:",      department);
                        InfoRow("Pozisyon:",       jobRole);
                        InfoRow("Değerlendirme Dönemi:", cycleName);
                        InfoRow("Oluşturma Tarihi:", plan.CreatedAt.ToString("dd.MM.yyyy"));
                        InfoRow("Onay Tarihi:",    plan.ApprovedAt?.ToString("dd.MM.yyyy") ?? "-");
                        InfoRow("Plan Durumu:",    MapStatus(plan.Status));
                    });

                    col.Item().PaddingTop(8).LineHorizontal(1).LineColor(Colors.Grey.Medium);
                });

                // ── CONTENT — TABLE ─────────────────────────────────────────
                page.Content().PaddingTop(12).Table(tbl =>
                {
                    tbl.ColumnsDefinition(c =>
                    {
                        c.ConstantColumn(28);   // No
                        c.RelativeColumn(4);    // Başlık
                        c.RelativeColumn(1.2f); // Öncelik
                        c.RelativeColumn(1.5f); // Son Tarih
                        c.RelativeColumn(1.2f); // Kaynak
                        c.RelativeColumn(1.5f); // Görev Durumu
                    });

                    // Header row
                    static IContainer HeaderCell(IContainer c) =>
                        c.DefaultTextStyle(t => t.Bold().FontSize(9))
                         .Background(Colors.Blue.Darken2)
                         .Padding(4);

                    tbl.Header(header =>
                    {
                        header.Cell().Element(HeaderCell).Text("No").FontColor(Colors.White);
                        header.Cell().Element(HeaderCell).Text("Aksiyon Başlığı").FontColor(Colors.White);
                        header.Cell().Element(HeaderCell).Text("Öncelik").FontColor(Colors.White);
                        header.Cell().Element(HeaderCell).Text("Son Tarih").FontColor(Colors.White);
                        header.Cell().Element(HeaderCell).Text("Kaynak").FontColor(Colors.White);
                        header.Cell().Element(HeaderCell).Text("Görev Durumu").FontColor(Colors.White);
                    });

                    // Data rows
                    bool alternate = false;
                    foreach (var item in items)
                    {
                        var bg = alternate ? Colors.Grey.Lighten3 : Colors.White;
                        alternate = !alternate;

                        taskMap.TryGetValue(item.Id, out var empTask);
                        var taskStatus = empTask is not null ? MapTaskStatus(empTask.Status) : "-";

                        static IContainer DataCell(IContainer c, string bg) =>
                            c.Background(bg).Padding(4).AlignMiddle();

                        tbl.Cell().Element(c => DataCell(c, bg)).Text(item.OrderNo.ToString());
                        tbl.Cell().Element(c => DataCell(c, bg)).Text(item.Title);
                        tbl.Cell().Element(c => DataCell(c, bg)).Text(MapPriority(item.Priority));
                        tbl.Cell().Element(c => DataCell(c, bg)).Text(item.DueDate?.ToString("dd.MM.yyyy") ?? "-");
                        tbl.Cell().Element(c => DataCell(c, bg)).Text(MapSource(item.Source));
                        tbl.Cell().Element(c => DataCell(c, bg)).Text(taskStatus);
                    }
                });

                // ── FOOTER ──────────────────────────────────────────────────
                page.Footer().Row(row =>
                {
                    row.RelativeItem().Text(
                        $"Oluşturulma tarihi: {DateTime.UtcNow:dd.MM.yyyy HH:mm}");

                    row.ConstantItem(80).AlignRight().Text(txt =>
                    {
                        txt.Span("Sayfa ");
                        txt.CurrentPageNumber();
                        txt.Span(" / ");
                        txt.TotalPages();
                    });
                });
            });
        }).GeneratePdf();

        return pdfBytes;
    }

    // ── Mapping helpers ───────────────────────────────────────────────────────

    private static string MapStatus(ActionPlanStatus s) => s switch
    {
        ActionPlanStatus.Draft     => "Taslak",
        ActionPlanStatus.Edited    => "Düzenlendi",
        ActionPlanStatus.Approved  => "Onaylandı",
        ActionPlanStatus.Sent      => "Gönderildi",
        ActionPlanStatus.Completed => "Tamamlandı",
        ActionPlanStatus.Cancelled => "İptal Edildi",
        _                          => s.ToString()
    };

    private static string MapPriority(PriorityLevel p) => p switch
    {
        PriorityLevel.High   => "Yüksek",
        PriorityLevel.Medium => "Orta",
        PriorityLevel.Low    => "Düşük",
        _                    => p.ToString()
    };

    private static string MapSource(ActionPlanItemSource src) => src switch
    {
        ActionPlanItemSource.AI       => "AI",
        ActionPlanItemSource.Manual   => "Manuel",
        ActionPlanItemSource.EditedAI => "Düzenlendi",
        _                             => src.ToString()
    };

    private static string MapTaskStatus(EmployeeTaskStatus s) => s switch
    {
        EmployeeTaskStatus.Assigned   => "Atandı",
        EmployeeTaskStatus.InProgress => "Devam Ediyor",
        EmployeeTaskStatus.Completed  => "Tamamlandı",
        EmployeeTaskStatus.Cancelled  => "İptal",
        _                             => s.ToString()
    };
}
