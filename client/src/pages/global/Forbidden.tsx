import { DefaultLayout } from "@/layouts/DefaultLayout";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import { Lock, Home, ArrowLeft } from "lucide-react";

const ForbiddenPage = () => {
  const navigate = useNavigate();

  return (
    <DefaultLayout
      meta={{
        title: "403 Forbidden",
      }}
    >
      <div className="flex items-center justify-center min-h-screen bg-linear-to-b from-background to-muted">
        <div className="text-center px-6 max-w-md">
          {/* Icon */}
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <Lock className="w-24 h-24 text-muted-foreground/30" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-4xl font-bold mb-3 text-destructive">
            Access Forbidden
          </h1>

          {/* Description */}
          <p className="text-lg text-muted-foreground mb-8">
            You don't have permission to access this resource. If you believe
            this is a mistake, please contact an administrator.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => navigate({ to: "/" })}
              className="flex items-center justify-center gap-2"
              size="lg"
            >
              <Home className="w-5 h-5" />
              Go to Home
            </Button>
            <Button
              onClick={() => window.history.back()}
              variant="outline"
              size="lg"
            >
              <ArrowLeft className="w-5 h-5" />
              Go Back
            </Button>
          </div>

          {/* Additional Help */}
          <p className="mt-8 text-sm text-muted-foreground">
            Need access? Contact your administrator for permissions.
          </p>
        </div>
      </div>
    </DefaultLayout>
  );
};

export default ForbiddenPage;
