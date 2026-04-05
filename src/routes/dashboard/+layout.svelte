<script lang="ts">
  import Sidebar from "$lib/components/Sidebar.svelte";
  import * as SidebarUI from "$lib/components/ui/sidebar/index.js";
  import Separator from "$lib/components/ui/separator/separator.svelte";
  import { page } from "$app/state";

  let { data, children } = $props();

  const titles: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/dashboard/leaderboard": "Leaderboard",
    "/dashboard/intergration": "Connected Apps",
    "/dashboard/artists": "Top Artists",
    "/dashboard/songs": "Top Songs",
    "/dashboard/streaks": "Streaks",
  };

  const currentTitle = $derived(titles[page.url.pathname] ?? "Dashboard");

  const sidebarUser = $derived(
    data.user
      ? {
          name: data.user.name,
          email: data.user.email,
          avatar: data.user.image ?? "",
        }
      : {
          name: "",
          email: "",
          avatar: "",
        },
  );
</script>

<SidebarUI.Provider>
  <Sidebar user={sidebarUser} />
  <SidebarUI.Inset>
    <header
      class="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 border-b mb-4"
    >
      <div class="flex items-center gap-2 px-4">
        <SidebarUI.Trigger class="-ml-1" />
        <Separator orientation="vertical" class="mr-2 h-4" />
        <h1 class="text-sm font-medium">{currentTitle}</h1>
      </div>
    </header>
    <main class="flex flex-1 flex-col gap-4 p-4 pt-0">
      {@render children()}
    </main>
  </SidebarUI.Inset>
</SidebarUI.Provider>
