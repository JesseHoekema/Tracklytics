<script lang="ts">
  import * as Card from "$lib/components/ui/card/index.js";
  import * as AlertDialog from "$lib/components/ui/alert-dialog/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import Input from "$lib/components/ui/input/input.svelte";
  import Label from "$lib/components/ui/label/label.svelte";
  import Button from "$lib/components/ui/button/button.svelte";
  import toast from "svelte-french-toast";

  let { data } = $props();

  const ranges = [
    { value: "today", label: "Today" },
    { value: "yesterday", label: "Yesterday" },
    { value: "7days", label: "Last 7 days" },
    { value: "30days", label: "Last 30 days" },
    { value: "90days", label: "Last 90 days" },
    { value: "180days", label: "Last 6 months" },
    { value: "365days", label: "Last year" },
    { value: "all", label: "All time" },
  ];

  let username = $state(data.job?.username ?? "");
  let selectedRange = $state(data.job?.range ?? "all");
  let status = $state<any>(data.job ?? null);
  let jobId = $state<string | null>(data.job?.id ?? null);
  let loading = $state(false);
  let stopping = $state(false);
  let deleting = $state(false);
  let pollInterval: ReturnType<typeof setInterval> | null = null;

  const currentRangeLabel = $derived(
    ranges.find((r) => r.value === selectedRange)?.label ?? "All time",
  );

  const isActive = $derived(
    status?.status === "running" || status?.status === "queued",
  );

  const pct = $derived(
    status?.total > 0 ? Math.round((status.progress / status.total) * 100) : 0,
  );

  $effect(() => {
    if (isActive && jobId) {
      pollInterval = setInterval(poll, 3000);
    }
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  });

  function getRangeTimestamps(range: string): { from?: number; to?: number } {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    switch (range) {
      case "today":
        return { from: Math.floor(startOfToday.getTime() / 1000) };
      case "yesterday": {
        const start = new Date(startOfToday);
        start.setDate(start.getDate() - 1);
        const end = new Date(startOfToday);
        end.setMilliseconds(-1);
        return {
          from: Math.floor(start.getTime() / 1000),
          to: Math.floor(end.getTime() / 1000),
        };
      }
      case "7days": {
        const d = new Date(startOfToday);
        d.setDate(d.getDate() - 7);
        return { from: Math.floor(d.getTime() / 1000) };
      }
      case "30days": {
        const d = new Date(startOfToday);
        d.setDate(d.getDate() - 30);
        return { from: Math.floor(d.getTime() / 1000) };
      }
      case "90days": {
        const d = new Date(startOfToday);
        d.setDate(d.getDate() - 90);
        return { from: Math.floor(d.getTime() / 1000) };
      }
      case "180days": {
        const d = new Date(startOfToday);
        d.setDate(d.getDate() - 180);
        return { from: Math.floor(d.getTime() / 1000) };
      }
      case "365days": {
        const d = new Date(startOfToday);
        d.setDate(d.getDate() - 365);
        return { from: Math.floor(d.getTime() / 1000) };
      }
      default:
        return {};
    }
  }

  async function startImport() {
    if (!username.trim()) return;
    loading = true;
    try {
      const timestamps = getRangeTimestamps(selectedRange);
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          range: selectedRange,
          ...timestamps,
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      jobId = json.jobId;
      status = {
        id: json.jobId,
        username,
        range: selectedRange,
        status: "queued",
        progress: 0,
        total: 0,
        error: null,
      };
      clearInterval(pollInterval!);
      pollInterval = setInterval(poll, 3000);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      loading = false;
    }
  }

  async function stopImport() {
    if (!jobId) return;
    stopping = true;
    try {
      const res = await fetch(`/api/import/${jobId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      clearInterval(pollInterval!);
      pollInterval = null;
      status = { ...status, status: "cancelled" };
      toast.success("Import stopped. Your data so far has been kept.");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      stopping = false;
    }
  }

  async function stopAndDelete() {
    if (!jobId) return;
    deleting = true;
    try {
      const res = await fetch(`/api/import/${jobId}`, { method: "PATCH" });
      if (!res.ok) throw new Error(await res.text());
      clearInterval(pollInterval!);
      pollInterval = null;
      jobId = null;
      status = null;
      username = "";
      selectedRange = "all";
      toast.success("Import stopped and all data deleted.");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      deleting = false;
    }
  }

  async function poll() {
    if (!jobId) return;
    const res = await fetch(`/api/import/${jobId}`);
    if (!res.ok) return;
    status = await res.json();

    if (
      status.status === "done" ||
      status.status === "failed" ||
      status.status === "cancelled"
    ) {
      clearInterval(pollInterval!);
      pollInterval = null;
      if (status.status === "done") toast.success("Import complete!");
      else if (status.status === "failed")
        toast.error("Import failed: " + status.error);
    }
  }
</script>

<Card.Root>
  <Card.Header>
    <Card.Title>Last.fm</Card.Title>
    <Card.Description>
      Import your listening history. The import keeps running even if you close
      this tab.
    </Card.Description>
  </Card.Header>
  <Card.Content>
    <div class="grid w-full gap-4">
      <div class="grid gap-2">
        <Label for="username">Last.fm Username</Label>
        <Input
          id="username"
          bind:value={username}
          placeholder="your_username"
          disabled={isActive}
        />
      </div>

      <div class="grid gap-2">
        <Label>Time Range</Label>
        <Select.Root
          type="single"
          bind:value={selectedRange}
          disabled={isActive}
        >
          <Select.Trigger class="w-full">
            {currentRangeLabel}
          </Select.Trigger>
          <Select.Content>
            {#each ranges as range}
              <Select.Item value={range.value} label={range.label}>
                {range.label}
              </Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>

      <Button onclick={startImport} disabled={loading || isActive}>
        {loading ? "Starting…" : "Import History"}
      </Button>

      {#if status}
        <div class="mt-1 space-y-3 text-sm">
          <div class="flex justify-between text-muted-foreground">
            <span class="capitalize">{status.status}</span>
            {#if status.total > 0}
              <span>{status.progress} / {status.total} pages ({pct}%)</span>
            {/if}
          </div>

          {#if isActive}
            <div class="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                class="h-full rounded-full bg-primary transition-all duration-500"
                style="width: {pct}%"
              ></div>
            </div>
            <p class="text-xs text-muted-foreground">
              You can close this tab — the import keeps running in the
              background.
            </p>

            <div class="flex gap-2 pt-1">
              <Button
                variant="outline"
                class="flex-1"
                disabled={stopping || deleting}
                onclick={stopImport}
              >
                {stopping ? "Stopping…" : "Stop & Keep Data"}
              </Button>

              <AlertDialog.Root>
                <AlertDialog.Trigger>
                  {#snippet child({ props })}
                    <Button
                      variant="destructive"
                      class="flex-1"
                      disabled={stopping || deleting}
                      {...props}
                    >
                      {deleting ? "Deleting…" : "Stop & Delete Data"}
                    </Button>
                  {/snippet}
                </AlertDialog.Trigger>
                <AlertDialog.Content>
                  <AlertDialog.Header>
                    <AlertDialog.Title>Are you sure?</AlertDialog.Title>
                    <AlertDialog.Description>
                      This will stop the import and permanently delete all
                      scrobbles imported so far. This cannot be undone.
                    </AlertDialog.Description>
                  </AlertDialog.Header>
                  <AlertDialog.Footer>
                    <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
                    <AlertDialog.Action onclick={stopAndDelete}>
                      Yes, delete everything
                    </AlertDialog.Action>
                  </AlertDialog.Footer>
                </AlertDialog.Content>
              </AlertDialog.Root>
            </div>
          {/if}

          {#if status.status === "cancelled"}
            <p class="text-muted-foreground text-xs">
              Import was stopped. You can start a new import at any time.
            </p>
          {/if}

          {#if status.status === "done"}
            <p class="text-xs text-green-500">
              Import complete — {status.total} pages imported.
            </p>
          {/if}

          {#if status.status === "failed"}
            <p class="text-destructive text-xs">{status.error}</p>
          {/if}
        </div>
      {/if}
    </div>
  </Card.Content>
</Card.Root>
