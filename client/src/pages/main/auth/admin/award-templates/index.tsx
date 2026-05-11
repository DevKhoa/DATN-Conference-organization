import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/layouts/AdminLayout";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AwardTemplatesTable } from "./components/award-templates-table";
import { AwardTemplateDialog } from "./components/award-template-dialog";
import { DeleteAwardTemplateDialog } from "./components/delete-award-template-dialog";
import {
  useCreateAwardTemplateMutation,
  useDeleteAwardTemplateMutation,
  useUpdateAwardTemplateMutation,
} from "@/features/awards/services/mutations";
import { useAwardTemplatesQuery } from "@/features/awards/services/queries";
import { AwardTemplateWithCriteria } from "@/features/awards/types";

const AdminManageAwardTemplatesPage = () => {
  const {
    data: templates = [],
    isLoading,
    isError,
    error,
  } = useAwardTemplatesQuery();

  const createMutation = useCreateAwardTemplateMutation();
  const updateMutation = useUpdateAwardTemplateMutation();
  const deleteMutation = useDeleteAwardTemplateMutation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [selectedTemplate, setSelectedTemplate] =
    useState<AwardTemplateWithCriteria | null>(null);
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const sortedTemplates = useMemo(
    () =>
      [...templates].sort(
        (a, b) =>
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime(),
      ),
    [templates],
  );

  const handleCreateClick = () => {
    setSelectedTemplate(null);
    setDialogOpen(true);
  };

  const handleEdit = (template: AwardTemplateWithCriteria) => {
    setSelectedTemplate(template);
    setDialogOpen(true);
  };

  const handleDelete = (template: AwardTemplateWithCriteria) => {
    setSelectedTemplate(template);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async (templateId: number) => {
    try {
      await deleteMutation.mutateAsync({ templateId });
      toast.success("Award template deleted.");
    } catch (deleteError: any) {
      toast.error(deleteError?.message || "Failed to delete award template.");
    }
  };

  return (
    <AdminLayout
      meta={{
        title: "Award Templates Management",
      }}
    >
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 lg:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold">Awards Template Management</h1>
            <p className="text-sm text-muted-foreground">
              Create, edit, and remove reusable templates for conference awards.
            </p>
          </div>

          <Button onClick={handleCreateClick}>
            <Plus className="mr-2 h-4 w-4" />
            Create Template
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : isError ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            Failed to load award templates:{" "}
            {error instanceof Error ? error.message : "Unknown error"}
          </div>
        ) : (
          <AwardTemplatesTable
            templates={sortedTemplates}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
      </div>

      <AwardTemplateDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        template={selectedTemplate}
        isSubmitting={isSubmitting}
        onCreate={createMutation.mutateAsync}
        onUpdate={updateMutation.mutateAsync}
      />

      <DeleteAwardTemplateDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        template={selectedTemplate}
        onConfirm={handleDeleteConfirm}
        isLoading={deleteMutation.isPending}
      />
    </AdminLayout>
  );
};

export default AdminManageAwardTemplatesPage;
