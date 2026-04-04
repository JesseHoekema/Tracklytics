<script lang="ts">
  import "./layout.css";
  import favicon from "$lib/assets/favicon.svg";
  import { ModeWatcher } from "mode-watcher";
  import { Toaster } from "svelte-french-toast";

  let { children } = $props();
</script>

<Toaster />
<ModeWatcher />
<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}
