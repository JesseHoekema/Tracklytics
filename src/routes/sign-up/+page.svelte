<script lang="ts">
  import { Button } from "$lib/components/ui/button/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import * as Card from "$lib/components/ui/card/index.js";
  import toast from "svelte-french-toast";
  import { goto } from "$app/navigation";

  let name = $state("");
  let email = $state("");
  let password = $state("");
  let isLoading = $state(false);

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    isLoading = true;

    try {
      const response = await fetch("/api/auth/sign-up/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "There was an issue creating your account",
        );
      }
      await goto("/dashboard");
    } catch (error) {
      console.error(error);
      toast.error("There was an issue creating your account");
    } finally {
      isLoading = false;
    }
  }
</script>

<svelte:head>
  <title>Sign Up | Tracklytics</title>
</svelte:head>

<Card.Root class="w-full max-w-sm mx-auto mt-20">
  <Card.Header class="p-6 pb-0 justify-center align-center pt-0 mt-0">
    <Card.Title class="text-3xl text-center">Sign Up</Card.Title>
  </Card.Header>

  <Card.Content class="p-6 pt-2">
    <form class="space-y-4" onsubmit={handleSubmit}>
      <div>
        <Label for="name" class="mb-1">Name</Label>
        <Input
          id="name"
          type="text"
          bind:value={name}
          placeholder="Your name"
          required
          disabled={isLoading}
        />
      </div>

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
        {isLoading ? "Creating account..." : "Sign Up"}
      </Button>

      <p class="text-center text-base">
        Already have an account?
        <a href="/sign-in" class="text-blue-500 underline"> Log in </a>
      </p>
    </form>
  </Card.Content>
</Card.Root>
