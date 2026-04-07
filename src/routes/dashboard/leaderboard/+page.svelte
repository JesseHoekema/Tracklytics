<script lang="ts">
  import { goto } from "$app/navigation";
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import CalendarIcon from "@lucide/svelte/icons/calendar";
  import TrophyIcon from "@lucide/svelte/icons/trophy";
  import type { LeaderboardUser } from "$lib/listentime";

  let { data } = $props();

  type RangeValue = "today" | "yesterday" | "7days" | "30days" | "all";
  const validRanges: RangeValue[] = [
    "today",
    "yesterday",
    "7days",
    "30days",
    "all",
  ];

  const isRangeValue = (value: string): value is RangeValue =>
    validRanges.includes(value as RangeValue);

  const options = [
    { value: "today", label: "Today" },
    { value: "yesterday", label: "Yesterday" },
    { value: "7days", label: "Last 7 Days" },
    { value: "30days", label: "Last 30 Days" },
    { value: "all", label: "All Time" },
  ];

  let selectedRange = $state<RangeValue>("7days");
  $effect(() => {
    selectedRange = (data.selectedRange ?? "7days") as RangeValue;
  });
  const currentLabel = $derived(
    options.find((o) => o.value === selectedRange)?.label ?? "Select range",
  );

  const selectedRangeLabel = $derived(
    options.find((o) => o.value === selectedRange)?.label ?? "Last 7 Days",
  );

  const onRangeChange = async (value: string) => {
    if (!isRangeValue(value) || value === data.selectedRange) return;
    selectedRange = value;
    const params = new URLSearchParams(window.location.search);
    params.set("range", value);
    await goto(`?${params.toString()}`, {
      keepFocus: true,
      noScroll: true,
    });
  };

  const leaderboardUsers = $derived(data.leaderboard?.users ?? []);
  const currentUserId = $derived(data.currentUserId);
</script>

<div class="space-y-4">
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-bold flex items-center gap-2">
      <TrophyIcon class="size-6" />
      Leaderboard
    </h1>

    <Select.Root
      type="single"
      bind:value={selectedRange}
      onValueChange={onRangeChange}
    >
      <Select.Trigger class="w-[200px]">
        <CalendarIcon class="mr-2 size-4 opacity-50" />
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

  <Card.Root class="w-full">
    <Card.Header>
      <Card.Title>Top Listeners ({selectedRangeLabel})</Card.Title>
      <Card.Description>Ranked by total listening time</Card.Description>
    </Card.Header>
    <Card.Content class="p-0">
      {#if leaderboardUsers.length === 0}
        <div class="p-8 text-center text-muted-foreground">
          No data available for this time period
        </div>
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full caption-bottom text-sm">
            <thead class="[&amp;_tr]:border-b">
              <tr class="border-b transition-colors hover:bg-muted/50">
                <th class="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&amp;:has([role=checkbox])]:pr-0 w-16">
                  Rank
                </th>
                <th class="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&amp;:has([role=checkbox])]:pr-0">
                  Listener
                </th>
                <th class="h-12 px-4 text-right align-middle font-medium text-muted-foreground [&amp;:has([role=checkbox])]:pr-0 w-32">
                  Time
                </th>
                <th class="h-12 px-4 text-right align-middle font-medium text-muted-foreground [&amp;:has([role=checkbox])]:pr-0 w-32">
                  Plays
                </th>
              </tr>
            </thead>
            <tbody class="[&amp;_tr:last-child]:border-0">
              {#each leaderboardUsers as user}
                <tr
                  class="border-b transition-colors hover:bg-muted/50 data-[current-user=true]:bg-muted"
                  data-current-user={user.userId === currentUserId}
                >
                  <td class="p-4 align-middle [&amp;:has([role=checkbox])]:pr-0">
                    <div
                      class="flex h-8 w-8 items-center justify-center rounded-full font-bold"
                      class:bg-yellow-400={user.rank === 1}
                      class:bg-gray-300={user.rank === 2}
                      class:bg-orange-600={user.rank === 3}
                      class:bg-muted={user.rank > 3}
                      class:text-black={user.rank === 1 || user.rank === 2}
                      class:text-white={user.rank === 3 || user.rank > 3}
                    >
                      {user.rank}
                    </div>
                  </td>
                  <td class="p-4 align-middle [&amp;:has([role=checkbox])]:pr-0">
                    <div class="flex items-center gap-3">
                      <div
                        class="relative flex flex-shrink-0 items-center justify-center rounded-full bg-muted font-semibold text-sm w-10 h-10"
                        class:bg-primary={user.userId === currentUserId}
                        class:text-primary-foreground={user.userId === currentUserId}
                      >
                        {user.userName?.charAt(0).toUpperCase() ?? "?"}
                      </div>
                      <div class="flex flex-col">
                        <span class="font-medium">
                          {user.userName ?? "Anonymous"}
                          {#if user.userId === currentUserId}
                            <span
                              class="ml-2 text-xs font-medium px-2 py-0.5 rounded-md bg-primary text-primary-foreground"
                            >
                              You
                            </span>
                          {/if}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td class="p-4 align-middle text-right">
                    <span class="font-medium">
                      {user.hours}h {user.minutes}m
                    </span>
                  </td>
                  <td class="p-4 align-middle text-right">
                    <span class="text-muted-foreground">
                      {user.totalPlays.toLocaleString()}
                    </span>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </Card.Content>
  </Card.Root>
</div>
