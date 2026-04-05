<script lang="ts">
  import * as Avatar from "$lib/components/ui/avatar/index.js";
  import * as DropdownMenu from "$lib/components/ui/dropdown-menu/index.js";
  import * as Sidebar from "$lib/components/ui/sidebar/index.js";
  import LogoutIcon from "@lucide/svelte/icons/log-out";
  import SettingsIcon from "@lucide/svelte/icons/settings";
  import ConnectedAppsIcon from "@lucide/svelte/icons/blocks";
  import SunIcon from "@lucide/svelte/icons/sun";
  import MoonIcon from "@lucide/svelte/icons/moon";
  import ChevronsUpDown from "@lucide/svelte/icons/chevrons-up-down";
  import { toggleMode } from "mode-watcher";
  import { goto } from "$app/navigation";
  import { authClient } from "$lib/auth-client";

  let { user }: { user: { name: string; email: string; avatar: string } } =
    $props();
  const sidebar = Sidebar.useSidebar();

  async function logoutUser() {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          goto("/sign-in");
        },
      },
    });
  }
</script>

<Sidebar.Menu>
  <Sidebar.MenuItem>
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        {#snippet child({ props })}
          <Sidebar.MenuButton
            {...props}
            size="lg"
            class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          >
            <Avatar.Root class="size-8 rounded-lg after:rounded-lg">
              <Avatar.Image
                src={user.avatar}
                alt={user.name}
                class="rounded-lg"
              />
              <Avatar.Fallback class="rounded-lg"
                >{(user.name || "")
                  .split(" ")
                  .slice(0, 2)
                  .map((w) => w[0])
                  .join("")}</Avatar.Fallback
              >
            </Avatar.Root>
            <div class="grid flex-1 text-left text-sm leading-tight">
              <span class="truncate font-medium">{user.name}</span>
              <span class="text-muted-foreground truncate text-xs"
                >{user.email}</span
              >
            </div>
            <ChevronsUpDown class="ml-auto size-4" />
          </Sidebar.MenuButton>
        {/snippet}
      </DropdownMenu.Trigger>
      <DropdownMenu.Content
        class="w-[--bits-dropdown-menu-anchor-width] min-w-56 rounded-lg"
        side={sidebar.isMobile ? "bottom" : "right"}
        align="end"
        sideOffset={4}
      >
        <DropdownMenu.Label class="p-0 font-normal">
          <div class="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
            <Avatar.Root class="h-8 w-8 rounded-lg after:rounded-lg">
              <Avatar.Image
                src={user.avatar}
                alt={user.name}
                class="rounded-lg"
              />
              <Avatar.Fallback class="rounded-lg"
                >{(user.name || "")
                  .split(" ")
                  .slice(0, 2)
                  .map((w) => w[0])
                  .join("")}</Avatar.Fallback
              >
            </Avatar.Root>
            <div class="grid flex-1 text-left text-sm leading-tight">
              <span class="truncate font-semibold text-primary"
                >{user.name}</span
              >
              <span class="truncate text-xs">{user.email}</span>
            </div>
          </div>
        </DropdownMenu.Label>
        <DropdownMenu.Separator />
        <DropdownMenu.Group>
          <DropdownMenu.Item
            class="cursor-pointer"
            onclick={() => goto("/settings")}
          >
            <SettingsIcon class="mr-2 size-4" />
            Settings
          </DropdownMenu.Item>
          <DropdownMenu.Item class="cursor-pointer" onclick={toggleMode}>
            <MoonIcon
              class="h-[1.2rem] w-[1.2rem] mr-2 scale-100 rotate-0 !transition-all dark:scale-0 dark:-rotate-90"
            />
            <SunIcon
              class="absolute h-[1.2rem] mr-2 w-[1.2rem] scale-0 rotate-90 !transition-all dark:scale-100 dark:rotate-0"
            />
            <span
              class="scale-100 rotate-0 !transition-all dark:scale-0 dark:-rotate-90 dark:hidden"
              >Dark Mode</span
            >
            <span
              class="scale-0 rotate-90 !transition-all dark:scale-100 dark:rotate-0"
              >Light Mode</span
            >
          </DropdownMenu.Item>
          <DropdownMenu.Item
            class="cursor-pointer"
            onclick={() => goto("/dashboard/intergration")}
          >
            <ConnectedAppsIcon class="mr-2 size-4" />
            Connected Apps
          </DropdownMenu.Item>
        </DropdownMenu.Group>
        <DropdownMenu.Separator />
        <DropdownMenu.Item class="cursor-pointer" onclick={logoutUser}>
          <LogoutIcon class="mr-2 size-4" />
          Log out
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  </Sidebar.MenuItem>
</Sidebar.Menu>
