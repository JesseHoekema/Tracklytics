<script lang="ts">
  import { goto } from "$app/navigation";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  type RangeValue = "today" | "yesterday" | "7days" | "30days" | "all";
  const validRanges: RangeValue[] = [
    "today",
    "yesterday",
    "7days",
    "30days",
    "all",
  ];

  const options = [
    { value: "today", label: "Today" },
    { value: "yesterday", label: "Yesterday" },
    { value: "7days", label: "Last 7 Days" },
    { value: "30days", label: "Last 30 Days" },
    { value: "all", label: "All Time" },
  ];

  const isRangeValue = (value: string): value is RangeValue =>
    validRanges.includes(value as RangeValue);

  let selectedRange = $state<RangeValue>("7days");
  $effect(() => {
    selectedRange = (data.selectedRange ?? "7days") as RangeValue;
  });

  const currentLabel = $derived(
    options.find((o) => o.value === selectedRange)?.label ?? "Last 7 Days",
  );

  const artists = $derived(data.artists ?? []);

  const onRangeChange = async (value: string) => {
    if (!isRangeValue(value) || value === data.selectedRange) return;
    selectedRange = value;
    const params = new URLSearchParams(window.location.search);
    params.set("range", value);
    await goto(`/dashboard/artists?${params.toString()}`, {
      keepFocus: true,
      noScroll: true,
    });
  };
</script>

<div class="space-y-4">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold">All Artists</h1>
      <p class="text-sm text-muted-foreground">
        {artists.length} artists in {currentLabel.toLowerCase()}
      </p>
    </div>

    <Select.Root
      type="single"
      bind:value={selectedRange}
      onValueChange={onRangeChange}
    >
      <Select.Trigger class="w-[200px]">
        {currentLabel}
      </Select.Trigger>
      <Select.Content>
        {#each options as option}
          <Select.Item value={option.value} label={option.label}>
            {option.label}
          </Select.Item>
        {/each}
      </Select.Content>
    </Select.Root>
  </div>

  <Card.Root>
    <Card.Header>
      <Card.Title>Artist Rankings</Card.Title>
      <Card.Description>Ranked by total plays</Card.Description>
    </Card.Header>
    <Card.Content>
      {#if artists.length === 0}
        <p class="text-sm text-muted-foreground">
          No artist data found for this range.
        </p>
      {:else}
        <div class="space-y-2">
          {#each artists as artist, index}
            <div
              class="flex items-center justify-between rounded-md border p-3"
            >
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-8 text-sm font-semibold text-muted-foreground">
                  #{index + 1}
                </div>
                <div class="truncate font-medium">{artist.artist}</div>
              </div>
              <div class="text-sm text-muted-foreground whitespace-nowrap">
                {artist.playCount} plays
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </Card.Content>
  </Card.Root>
</div>
