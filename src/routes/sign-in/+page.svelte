<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import { goto } from "$app/navigation";
  import toast from "svelte-french-toast";

  let email = $state("");
  let password = $state("");
  let isLoading = $state(false);

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    isLoading = true;

    try {
      const response = await fetch("/api/auth/sign-in/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.message || "There was an issue logging you in");
        throw new Error(data.message || "There was an issue logging you in");
      }

      await goto("/dashboard");
    } catch (error) {
      toast.error("There was an issue logging you in");
    } finally {
      isLoading = false;
    }
  }
</script>

<svelte:head>
  <title>Log In | Tracklytics</title>
</svelte:head>

<Card.Root class="w-full max-w-sm mx-auto mt-20">
  <Card.Header class="p-6 pb-0 justify-center align-center pt-0 mt-0">
    <Card.Title class="text-3xl text-center">Log In</Card.Title>
  </Card.Header>

  <Card.Content class="p-6 pt-2">
    <form class="space-y-4" onsubmit={handleSubmit}>
      <div>
        <Label for="email" class="mb-1">Email</Label>
        <Input
          id="email"
          type="email"
          bind:value={email}
          placeholder="my@email.com"
          required
          disabled={isLoading}
        />
      </div>

      <div>
        <Label for="password" class="mb-1">Password</Label>
        <Input
          id="password"
          type="password"
          bind:value={password}
          placeholder="············"
          required
          disabled={isLoading}
        />
      </div>

      <Button type="submit" class="w-full mt-4" disabled={isLoading}>
        {isLoading ? "Busy logging in..." : "Log In"}
      </Button>

      <p class="text-center text-base">
        No account?
        <a href="/sign-up" class="text-blue-500 underline"> Create one! </a>
      </p>
    </form>
  </Card.Content>
</Card.Root>
