<script lang="ts">
  import { page } from "$app/stores";
  import HomeIcon from "@lucide/svelte/icons/home";
  import LeaderboardIcon from "@lucide/svelte/icons/chart-column";
  import ArtistsIcon from "@lucide/svelte/icons/users";
  import SongsIcon from "@lucide/svelte/icons/music";
  import StreaksIcon from "@lucide/svelte/icons/flame";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import NavUser from "./nav-user.svelte";
  import { useSidebar } from "$lib/components/ui/sidebar/index.js";
  import { mode } from "mode-watcher";

  let { user }: { user: { name: string; email: string; avatar: string } } =
    $props();

  const sidebar = useSidebar();

  let logoSrc = $derived.by(() => {
    if (sidebar.state === "expanded") {
      return mode.current === "dark"
        ? "/assets/logo.png"
        : "/assets/logo-light.png";
    }
    return "/assets/logo-icon.png";
  });

  let logoClass = $derived(
    sidebar.state === "expanded" ? "w-58 h-auto" : "w-10 h-auto",
  );
  let divClass = $derived(
    sidebar.state === "expanded"
      ? "p-4 flex items-center justify-left border-b"
      : "p-[9px] flex items-center justify-center border-b",
  );

  const items = [
    {
      title: "Home",
      url: "/dashboard",
      icon: HomeIcon,
    },
    {
      title: "Leaderboard",
      url: "/dashboard/leaderboard",
      icon: LeaderboardIcon,
    },
    {
      title: "Artists",
      url: "/dashboard/artists",
      icon: ArtistsIcon,
    },
    {
      title: "Songs",
      url: "/dashboard/songs",
      icon: SongsIcon,
    },
    {
      title: "Streaks",
      url: "/dashboard/streaks",
      icon: StreaksIcon,
    },
  ];
</script>

<Sidebar.Root variant="floating" collapsible="icon">
  <div class={divClass}>
    {#if logoSrc}
      <img src={logoSrc} alt="Logo" class={logoClass} />
    {/if}
  </div>

  <Sidebar.Content>
    <Sidebar.Group>
      <Sidebar.GroupContent>
        <Sidebar.Menu>
          {#each items as item (item.title)}
            <Sidebar.MenuItem>
              <Sidebar.MenuButton isActive={$page.url.pathname === item.url}>
                {#snippet child({ props })}
                  <a href={item.url} {...props}>
                    <item.icon />
                    <span>{item.title}</span>
                  </a>
                {/snippet}
              </Sidebar.MenuButton>
            </Sidebar.MenuItem>
          {/each}
        </Sidebar.Menu>
      </Sidebar.GroupContent>
    </Sidebar.Group>
  </Sidebar.Content>

  <Sidebar.Footer>
    <Sidebar.Menu>
      <NavUser {user} />
    </Sidebar.Menu>
  </Sidebar.Footer>
</Sidebar.Root>
