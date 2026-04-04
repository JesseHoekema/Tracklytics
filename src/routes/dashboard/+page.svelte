<script lang="ts">
  import * as Card from "$lib/components/ui/card/index.js";
  import * as Select from "$lib/components/ui/select/index.js";
  import * as Chart from "$lib/components/ui/chart/index.js";
  import * as Tabs from "$lib/components/ui/tabs/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import CalendarIcon from "@lucide/svelte/icons/calendar";
  import TrendingUpIcon from "@lucide/svelte/icons/trending-up";
  import ChevronLeftIcon from "@lucide/svelte/icons/chevron-left";
  import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
  import { scaleBand } from "d3-scale";
  import { BarChart, PieChart } from "layerchart";
  import { cubicInOut } from "svelte/easing";

  let { data } = $props();

  const options = [
    { value: "today", label: "Today" },
    { value: "yesterday", label: "Yesterday" },
    { value: "7days", label: "Last 7 Days" },
    { value: "30days", label: "Last 30 Days" },
    { value: "all", label: "All Time" },
  ];

  let selectedRange = $state("7days");
  const currentLabel = $derived(
    options.find((o) => o.value === selectedRange)?.label ?? "Select range",
  );

  const genreColors = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
    "oklch(0.72 0.16 22)",
  ];

  const getColor = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return genreColors[Math.abs(hash) % genreColors.length];
  };

  const topArtistsData = [
    { artist: "Goldkimono", minutes: 120 },
    { artist: "FKJ", minutes: 85 },
    { artist: "Tash Sultana", minutes: 70 },
    { artist: "Khruangbin", minutes: 50 },
    { artist: "Jungle", minutes: 40 },
    { artist: "Masego", minutes: 35 },
    { artist: "Maribou State", minutes: 30 },
    { artist: "L'Impératrice", minutes: 25 },
    { artist: "Parcels", minutes: 22 },
    { artist: "Poolside", minutes: 18 },
  ];

  const topSongsData = [
    { song: "Does it move you", artist: "Goldkimono", minutes: 95 },
    { song: "Ylang Ylang", artist: "FKJ", minutes: 65 },
    { song: "Jungle", artist: "Tash Sultana", minutes: 60 },
    { song: "Texas Sun", artist: "Khruangbin", minutes: 45 },
    { song: "Casio", artist: "Jungle", minutes: 38 },
    { song: "Tadow", artist: "Masego", minutes: 32 },
    { song: "Steal", artist: "Maribou State", minutes: 28 },
    { song: "Anomalie bleue", artist: "L'Impératrice", minutes: 22 },
    { song: "Lightenup", artist: "Parcels", minutes: 20 },
    { song: "Harvest Moon", artist: "Poolside", minutes: 15 },
  ];

  const topGenresData = [
    { genre: "Indie Pop", count: 450 },
    { genre: "Alternative", count: 380 },
    { genre: "Electronic", count: 320 },
    { genre: "Soul", count: 210 },
    { genre: "Jazz", count: 180 },
    { genre: "Folk", count: 120 },
  ];

  const chartConfig = {
    minutes: { label: "Minutes", color: "var(--chart-1)" },
  } satisfies Chart.ChartConfig;

  const genreChartConfig = {
    count: { label: "Plays", color: "var(--chart-1)" },
  } satisfies Chart.ChartConfig;

  const pages = [topArtistsData.slice(0, 5), topArtistsData.slice(5, 10)];
  const songPages = [topSongsData.slice(0, 5), topSongsData.slice(5, 10)];

  const globalMax = Math.max(...topArtistsData.map((d) => d.minutes));
  const songGlobalMax = Math.max(...topSongsData.map((d) => d.minutes));

  let chartType = $state("pie");
  let scrollContainer = $state<HTMLDivElement | null>(null);

  const scroll = (direction: "next" | "prev") => {
    if (!scrollContainer) return;
    const scrollAmount = scrollContainer.offsetWidth;
    scrollContainer.scrollBy({
      left: direction === "next" ? scrollAmount : -scrollAmount,
      behavior: "smooth",
    });
  };

  let songChartType = $state("bar");
  let songScrollContainer = $state<HTMLDivElement | null>(null);

  const scrollSongs = (direction: "next" | "prev") => {
    if (!songScrollContainer) return;
    const scrollAmount = songScrollContainer.offsetWidth;
    songScrollContainer.scrollBy({
      left: direction === "next" ? scrollAmount : -scrollAmount,
      behavior: "smooth",
    });
  };
</script>

<div class="flex items-center justify-between mb-4">
  <h1 class="text-2xl font-bold">Welcome back! {data.user?.name ?? "Guest"}</h1>

  <Select.Root type="single" bind:value={selectedRange}>
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

<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
  <Card.Root>
    <Card.Header class="pb-2">
      <Card.Title class="text-sm font-medium text-muted-foreground"
        >Total Listening Time</Card.Title
      >
    </Card.Header>
    <Card.Content>
      <div class="text-2xl font-bold font-sans">10m</div>
    </Card.Content>
  </Card.Root>

  <Card.Root>
    <Card.Header class="pb-2">
      <Card.Title class="text-sm font-medium text-muted-foreground"
        >Top Artist</Card.Title
      >
    </Card.Header>
    <Card.Content>
      <div class="text-2xl font-bold">Goldkimono</div>
    </Card.Content>
  </Card.Root>

  <Card.Root>
    <Card.Header class="pb-2">
      <Card.Title class="text-sm font-medium text-muted-foreground"
        >Top Song</Card.Title
      >
    </Card.Header>
    <Card.Content>
      <div class="text-2xl font-bold">Does it move you</div>
    </Card.Content>
  </Card.Root>

  <Card.Root>
    <Card.Header class="pb-2">
      <Card.Title class="text-sm font-medium text-muted-foreground"
        >Top Genre</Card.Title
      >
    </Card.Header>
    <Card.Content>
      <div class="text-2xl font-bold">Indie Pop</div>
    </Card.Content>
  </Card.Root>
</div>

<div class="grid gap-4 md:grid-cols-2 mt-4">
  <Card.Root>
    <Card.Header class="flex flex-row items-center justify-between space-y-0">
      <div class="space-y-1.5">
        <Card.Title>Top Artists</Card.Title>
        <Card.Description
          >Listening time in minutes (last 7 days)</Card.Description
        >
      </div>
      <div class="flex items-center gap-4">
        <Tabs.Root value={chartType} onValueChange={(v) => (chartType = v)}>
          <Tabs.List class="h-8 p-0.5">
            <Tabs.Trigger value="bar" class="h-7 px-3 text-xs">Bar</Tabs.Trigger
            >
            <Tabs.Trigger value="pie" class="h-7 px-3 text-xs">Pie</Tabs.Trigger
            >
          </Tabs.List>
        </Tabs.Root>

        {#if chartType === "bar"}
          <div class="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              class="size-8"
              onclick={() => scroll("prev")}
            >
              <ChevronLeftIcon class="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              class="size-8"
              onclick={() => scroll("next")}
            >
              <ChevronRightIcon class="size-4" />
            </Button>
          </div>
        {/if}
      </div>
    </Card.Header>
    <Card.Content>
      {#if chartType === "bar"}
        <div
          class="overflow-x-auto snap-x snap-mandatory no-scrollbar flex"
          bind:this={scrollContainer}
        >
          {#each pages as pageData}
            <div class="min-w-full snap-center px-1">
              <Chart.Container config={chartConfig} class="min-h-[180px]">
                <BarChart
                  data={pageData}
                  yDomain={[0, globalMax]}
                  xScale={scaleBand().padding(0.25)}
                  x="artist"
                  axis="x"
                  series={[
                    {
                      key: "minutes",
                      label: "Minutes",
                      color: chartConfig.minutes.color,
                    },
                  ]}
                  props={{
                    bars: {
                      stroke: "none",
                      rounded: "all",
                      radius: 8,
                      motion: {
                        type: "tween",
                        duration: 500,
                        easing: cubicInOut,
                      },
                    },
                    highlight: { area: { fill: "none" } },
                    xAxis: { format: (d) => d },
                  }}
                >
                  {#snippet tooltip()}
                    <Chart.Tooltip hideLabel />
                  {/snippet}
                </BarChart>
              </Chart.Container>
            </div>
          {/each}
        </div>
      {:else}
        <Chart.Container config={chartConfig} class="min-h-[180px]">
          <PieChart
            data={topArtistsData}
            key="artist"
            value="minutes"
            label="artist"
            c={(d: (typeof topArtistsData)[0]) => getColor(d.artist)}
            innerRadius={0}
            cornerRadius={0}
            padAngle={0}
            props={{
              pie: {
                motion: { type: "tween", duration: 1000, easing: cubicInOut },
              },
            }}
          >
            {#snippet tooltip()}
              <Chart.Tooltip hideLabel />
            {/snippet}
          </PieChart>
        </Chart.Container>

        <!-- Repositioned wrapping legend -->
        <div
          class="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-2"
        >
          {#each topArtistsData as artist}
            <div class="flex items-center gap-1.5 text-xs">
              <div
                class="size-2.5 rounded-[2px] shrink-0"
                style:background={getColor(artist.artist)}
              ></div>
              <span class="text-muted-foreground whitespace-nowrap"
                >{artist.artist}</span
              >
            </div>
          {/each}
        </div>
      {/if}
    </Card.Content>
  </Card.Root>

  <Card.Root>
    <Card.Header class="flex flex-row items-center justify-between space-y-0">
      <div class="space-y-1.5">
        <Card.Title>Top Songs</Card.Title>
        <Card.Description
          >Listening time in minutes (last 7 days)</Card.Description
        >
      </div>
      <div class="flex items-center gap-4">
        <Tabs.Root
          value={songChartType}
          onValueChange={(v) => (songChartType = v)}
        >
          <Tabs.List class="h-8 p-0.5">
            <Tabs.Trigger value="bar" class="h-7 px-3 text-xs">Bar</Tabs.Trigger
            >
            <Tabs.Trigger value="pie" class="h-7 px-3 text-xs">Pie</Tabs.Trigger
            >
          </Tabs.List>
        </Tabs.Root>

        {#if songChartType === "bar"}
          <div class="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              class="size-8"
              onclick={() => scrollSongs("prev")}
            >
              <ChevronLeftIcon class="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              class="size-8"
              onclick={() => scrollSongs("next")}
            >
              <ChevronRightIcon class="size-4" />
            </Button>
          </div>
        {/if}
      </div>
    </Card.Header>
    <Card.Content>
      {#if songChartType === "bar"}
        <div
          class="overflow-x-auto snap-x snap-mandatory no-scrollbar flex"
          bind:this={songScrollContainer}
        >
          {#each songPages as pageData}
            <div class="min-w-full snap-center px-1">
              <Chart.Container config={chartConfig} class="min-h-[180px]">
                <BarChart
                  data={pageData}
                  yDomain={[0, songGlobalMax]}
                  xScale={scaleBand().padding(0.25)}
                  x="song"
                  axis="x"
                  series={[
                    {
                      key: "minutes",
                      label: "Minutes",
                      color: chartConfig.minutes.color,
                    },
                  ]}
                  props={{
                    bars: {
                      stroke: "none",
                      rounded: "all",
                      radius: 8,
                      motion: {
                        type: "tween",
                        duration: 500,
                        easing: cubicInOut,
                      },
                    },
                    highlight: { area: { fill: "none" } },
                    xAxis: { format: (d) => d },
                  }}
                >
                  {#snippet tooltip()}
                    <Chart.Tooltip hideLabel />
                  {/snippet}
                </BarChart>
              </Chart.Container>
            </div>
          {/each}
        </div>
      {:else}
        <Chart.Container config={chartConfig} class="min-h-[180px]">
          <PieChart
            data={topSongsData}
            key="song"
            value="minutes"
            label="song"
            c={(d: (typeof topSongsData)[0]) => getColor(d.song)}
            innerRadius={0}
            cornerRadius={0}
            padAngle={0}
            props={{
              pie: {
                motion: { type: "tween", duration: 1000, easing: cubicInOut },
              },
            }}
          >
            {#snippet tooltip()}
              <Chart.Tooltip hideLabel />
            {/snippet}
          </PieChart>
        </Chart.Container>

        <!-- Repositioned wrapping legend -->
        <div
          class="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-2"
        >
          {#each topSongsData as item}
            <div class="flex items-center gap-1.5 text-xs">
              <div
                class="size-2.5 rounded-[2px] shrink-0"
                style:background={getColor(item.song)}
              ></div>
              <span class="text-muted-foreground whitespace-nowrap"
                >{item.song}</span
              >
            </div>
          {/each}
        </div>
      {/if}
    </Card.Content>
  </Card.Root>
  <div class="mt-4">
    <Card.Root>
      <Card.Header>
        <Card.Title>Top Genres</Card.Title>
        <Card.Description
          >Listening count by genre (last 7 days)</Card.Description
        >
      </Card.Header>
      <Card.Content>
        <Chart.Container config={genreChartConfig}>
          <BarChart
            labels={{ offset: 12 }}
            data={topGenresData}
            orientation="horizontal"
            yScale={scaleBand().padding(0.25)}
            y="genre"
            axis="y"
            c={(d: (typeof topGenresData)[0]) => d.genre}
            cRange={genreColors}
            rule={false}
            series={[
              {
                key: "count",
                label: "Plays",
              },
            ]}
            padding={{ right: 16 }}
            props={{
              bars: {
                stroke: "none",
                radius: 5,
                rounded: "all",
                motion: { type: "tween", duration: 500, easing: cubicInOut },
              },
              highlight: { area: { fill: "none" } },
              yAxis: {
                tickLabelProps: {
                  textAnchor: "start",
                  dx: 6,
                  class: "stroke-none fill-white!",
                },
                tickLength: 0,
              },
            }}
          >
            {#snippet tooltip()}
              <Chart.Tooltip hideLabel />
            {/snippet}
          </BarChart>
        </Chart.Container>
      </Card.Content>
    </Card.Root>
  </div>
</div>
