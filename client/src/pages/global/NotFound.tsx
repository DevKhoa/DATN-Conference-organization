import { DefaultLayout } from "@/layouts/DefaultLayout";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import { Home, Search } from "lucide-react";

const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <DefaultLayout
      meta={{
        title: "404 Not Found",
      }}
    >
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-background to-muted">
        <div className="text-center px-6 max-w-md">
          {/* Icon */}
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <Search className="w-24 h-24 text-muted-foreground/30" />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-4xl font-bold mb-3 text-foreground">
            Page Not Found
          </h1>

          {/* Description */}
          <p className="text-lg text-muted-foreground mb-8">
            Sorry, the page you're looking for doesn't exist or has been moved.
            Let's get you back on track.
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
              Go Back
            </Button>
          </div>

          {/* Additional Help */}
          <p className="mt-8 text-sm text-muted-foreground">
            If you believe this is an error, please contact support.
          </p>
        </div>
      </div>
    </DefaultLayout>
  );
};

export default NotFoundPage;
