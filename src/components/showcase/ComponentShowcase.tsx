import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ComponentShowcase() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-6xl px-6 py-12">
        {/* Header */}
        <header className="mb-12">
          <p className="mb-2 text-sm font-medium uppercase tracking-wider text-primary">
            Kyougen's Design System
          </p>

          <h1 className="text-4xl font-bold tracking-tight">
            Component Library
          </h1>

          <p className="mt-3 max-w-2xl text-muted-foreground">
            A reusable component system for rapidly building modern
            applications.
          </p>
        </header>

        {/* Buttons */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold">Buttons</h2>

          <div className="flex flex-wrap gap-3">
            <Button>Primary</Button>
            <Button variant="outline">Outline</Button>
          </div>
        </section>

        {/* Future sections */}
        <section className="mb-12">
          <h2 className="mb-6 text-2xl font-semibold">Typography</h2>

          <div className="space-y-8">
            <div>
              <p className="mb-2 text-sm font-medium text-muted-foreground">
                Display
              </p>
              <p className="text-6xl font-bold tracking-tight">Build faster.</p>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-muted-foreground">
                Heading 1
              </p>
              <h1 className="text-4xl font-bold tracking-tight">
                Component Library
              </h1>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-muted-foreground">
                Heading 2
              </p>
              <h2 className="text-3xl font-semibold tracking-tight">
                Build your next app
              </h2>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-muted-foreground">
                Heading 3
              </p>
              <h3 className="text-2xl font-semibold">Account Overview</h3>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-muted-foreground">
                Body
              </p>
              <p className="max-w-2xl text-base">
                A reusable component system designed to help you build polished
                applications quickly without recreating the same UI from
                scratch.
              </p>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-muted-foreground">
                Small
              </p>
              <p className="text-sm text-muted-foreground">
                Supporting information and secondary content.
              </p>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium text-muted-foreground">
                Caption
              </p>
              <p className="text-xs text-muted-foreground">
                Last updated 2 minutes ago
              </p>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 text-2xl font-semibold">Colors</h2>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="overflow-hidden rounded-xl border border-border">
              <div className="h-24 bg-primary" />

              <div className="p-4">
                <p className="font-semibold">Primary</p>
                <p className="mt-1 text-sm text-muted-foreground">#E6FF4B</p>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-border">
              <div className="h-24 bg-secondary" />

              <div className="p-4">
                <p className="font-semibold">Secondary</p>
                <p className="mt-1 text-sm text-muted-foreground">#03D791</p>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-border">
              <div className="h-24 bg-accent" />

              <div className="p-4">
                <p className="font-semibold">Accent</p>
                <p className="mt-1 text-sm text-muted-foreground">#00BDF9</p>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-border">
              <div className="h-24 bg-card" />

              <div className="p-4">
                <p className="font-semibold">Card</p>
                <p className="mt-1 text-sm text-muted-foreground">#161618</p>
              </div>
            </div>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-success" />
              <div>
                <p className="text-sm font-medium">Success</p>
                <p className="text-xs text-muted-foreground">#03D791</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-warning" />
              <div>
                <p className="text-sm font-medium">Warning</p>
                <p className="text-xs text-muted-foreground">#E6FF4B</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-info" />
              <div>
                <p className="text-sm font-medium">Info</p>
                <p className="text-xs text-muted-foreground">#00BDF9</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-destructive" />
              <div>
                <p className="text-sm font-medium">Destructive</p>
                <p className="text-xs text-muted-foreground">#FF4D4D</p>
              </div>
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl bg-gradient-total-balance p-6 text-black">
              <p className="text-sm font-medium">Total Balance Gradient</p>

              <p className="mt-8 text-2xl font-bold">$24,680.42</p>
            </div>

            <div className="rounded-3xl bg-gradient-credit-card p-6">
              <p className="text-sm font-medium">Credit Card Gradient</p>

              <p className="mt-8 text-2xl font-bold">•••• 4821</p>
            </div>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-6 text-2xl font-semibold">Inputs</h2>

          <div className="grid max-w-3xl gap-8">
            {/* Default */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Default
              </p>

              <Input placeholder="Enter your name" />
            </div>

            {/* With Value */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                With Value
              </p>

              <Input defaultValue="First Last" />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Email</p>

              <Input type="email" placeholder="you@example.com" />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Password
              </p>

              <Input type="password" placeholder="Enter your password" />
            </div>

            {/* Search */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Search
              </p>

              <Input type="search" placeholder="Search..." />
            </div>

            {/* Number */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Number
              </p>

              <Input type="number" placeholder="0" />
            </div>

            {/* Date */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Date</p>

              <Input type="date" />
            </div>

            {/* File */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">File</p>

              <Input type="file" />
            </div>

            {/* Disabled */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Disabled
              </p>

              <Input disabled placeholder="This input is disabled" />
            </div>

            {/* Required */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Required
              </p>

              <Input required placeholder="This field is required" />
            </div>

            {/* Invalid */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Invalid
              </p>

              <Input aria-invalid="true" defaultValue="invalid@email" />

              <p className="text-sm text-destructive">
                Please enter a valid email address.
              </p>
            </div>

            {/* Read Only */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Read Only
              </p>

              <Input readOnly value="Account #482901" />
            </div>

            {/* Custom Width */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Custom Width
              </p>

              <Input placeholder="Small input" className="max-w-xs" />
            </div>
          </div>
        </section>
        <section className="mb-12">
          <h2 className="mb-6 text-2xl font-semibold">Labels</h2>

          <div className="grid max-w-3xl gap-8">
            {/* Default */}
            <div className="space-y-2">
              <Label htmlFor="label-default">Email Address</Label>

              <Input
                id="label-default"
                type="email"
                placeholder="you@example.com"
              />
            </div>

            {/* Required */}
            <div className="space-y-2">
              <Label htmlFor="label-required">
                Email Address
                <span className="ml-1 text-destructive">*</span>
              </Label>

              <Input
                id="label-required"
                type="email"
                placeholder="Required field"
                required
              />
            </div>

            {/* With Description */}
            <div className="space-y-2">
              <Label htmlFor="label-description">Username</Label>

              <Input id="label-description" placeholder="placeholder" />

              <p className="text-sm text-muted-foreground">
                This is how your username will appear publicly.
              </p>
            </div>

            {/* Disabled */}
            <div className="space-y-2">
              <Label htmlFor="label-disabled" className="opacity-50">
                Account ID
              </Label>

              <Input id="label-disabled" value="ACC-482901" disabled />
            </div>

            {/* Custom */}
            <div className="space-y-2">
              <Label htmlFor="label-custom" className="text-primary">
                Featured Field
              </Label>

              <Input id="label-custom" placeholder="Custom label styling" />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
