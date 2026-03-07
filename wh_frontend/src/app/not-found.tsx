import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-lg">
        <CardContent className="space-y-5 py-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">404</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Page not found</h1>
          <p className="text-sm text-slate-600">
            The page you requested does not exist or was moved to another route.
          </p>
          <Link href="/dashboard" className="inline-flex">
            <Button>
              <ArrowLeft size={16} className="mr-2" />
              Back to dashboard
            </Button>
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
