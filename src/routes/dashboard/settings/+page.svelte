<script lang="ts">
  import { enhance } from "$app/forms";
  import * as Card from "$lib/components/ui/card";
  import * as Alert from "$lib/components/ui/alert";
  import { Button } from "$lib/components/ui/button";
  import { Input } from "$lib/components/ui/input";
  import { AlertCircle, CheckCircle2 } from "lucide-svelte";
  import type { ActionData } from "./$types";

  export let form: ActionData;

  let emailForm = $state({ email: "", isSubmitting: false });
  let passwordForm = $state({
    password: "",
    confirmPassword: "",
    isSubmitting: false,
  });
  let showDeleteScrobblesModal = $state(false);
  let deleteScrobblesConfirmation = $state("");
  let showDeleteAccountModal = $state(false);
  let deleteAccountConfirmation = $state("");
  let successMessage = $state("");
  let errorMessage = $state("");

  function handleEmailSubmit() {
    emailForm.isSubmitting = true;
    return async ({ update }: any) => {
      await update();
      emailForm.isSubmitting = false;
      if (form?.success) {
        successMessage = form.message || "Email updated successfully";
        emailForm.email = "";
        setTimeout(() => (successMessage = ""), 3000);
      } else if (form?.error) {
        errorMessage = form.error;
        setTimeout(() => (errorMessage = ""), 3000);
      }
    };
  }

  function handlePasswordSubmit() {
    passwordForm.isSubmitting = true;
    return async ({ update }: any) => {
      await update();
      passwordForm.isSubmitting = false;
      if (form?.success) {
        successMessage = form.message || "Password updated successfully";
        passwordForm.password = "";
        passwordForm.confirmPassword = "";
        setTimeout(() => (successMessage = ""), 3000);
      } else if (form?.error) {
        errorMessage = form.error;
        setTimeout(() => (errorMessage = ""), 3000);
      }
    };
  }

  function handleDeleteScrobbles() {
    if (deleteScrobblesConfirmation !== "DELETE_ALL_SCROBBLES") {
      errorMessage = "Invalid confirmation text";
      return;
    }
    return async ({ update }: any) => {
      await update();
      if (form?.success) {
        successMessage = form.message || "All scrobbles deleted";
        showDeleteScrobblesModal = false;
        deleteScrobblesConfirmation = "";
      } else if (form?.error) {
        errorMessage = form.error;
      }
    };
  }

  function handleDeleteAccount() {
    if (deleteAccountConfirmation !== "DELETE_ACCOUNT") {
      errorMessage = "Invalid confirmation text";
      return;
    }
    return async ({ update }: any) => {
      await update();
      if (form?.success) {
        // Will redirect automatically after account deletion
      } else if (form?.error) {
        errorMessage = form.error;
      }
    };
  }
</script>

<div class="space-y-6">
  <div>
    <h1 class="text-3xl font-bold">Settings</h1>
    <p class="text-muted-foreground">Manage your account and data</p>
  </div>

  {#if successMessage}
    <Alert.Root class="border-green-200 bg-green-50">
      <CheckCircle2 class="h-4 w-4 text-green-600" />
      <Alert.Title class="text-green-800">Success</Alert.Title>
      <Alert.Description class="text-green-700"
        >{successMessage}</Alert.Description
      >
    </Alert.Root>
  {/if}

  {#if errorMessage}
    <Alert.Root class="border-destructive bg-destructive/10">
      <AlertCircle class="h-4 w-4 text-destructive" />
      <Alert.Title class="text-destructive">Error</Alert.Title>
      <Alert.Description class="text-destructive"
        >{errorMessage}</Alert.Description
      >
    </Alert.Root>
  {/if}

  <!-- Email Section -->
  <Card.Root>
    <Card.Header>
      <Card.Title>Email Address</Card.Title>
      <Card.Description>Update your email address</Card.Description>
    </Card.Header>
    <Card.Content>
      <form
        method="POST"
        action="?/updateEmail"
        use:enhance={handleEmailSubmit()}
        class="space-y-4"
      >
        <div class="space-y-2">
          <label for="current-email" class="text-sm font-medium"
            >Current Email</label
          >
          <Input id="current-email" type="email" disabled class="bg-muted" />
        </div>
        <div class="space-y-2">
          <label for="new-email" class="text-sm font-medium">New Email</label>
          <Input
            id="new-email"
            name="email"
            type="email"
            placeholder="your-new-email@example.com"
            bind:value={emailForm.email}
            required
          />
        </div>
        <Button
          type="submit"
          disabled={emailForm.isSubmitting}
          class="w-full sm:w-auto"
        >
          {emailForm.isSubmitting ? "Updating..." : "Update Email"}
        </Button>
      </form>
    </Card.Content>
  </Card.Root>

  <!-- Password Section -->
  <Card.Root>
    <Card.Header>
      <Card.Title>Password</Card.Title>
      <Card.Description>Change your password</Card.Description>
    </Card.Header>
    <Card.Content>
      <form
        method="POST"
        action="?/updatePassword"
        use:enhance={handlePasswordSubmit()}
        class="space-y-4"
      >
        <div class="space-y-2">
          <label for="new-password" class="text-sm font-medium"
            >New Password</label
          >
          <Input
            id="new-password"
            name="password"
            type="password"
            placeholder="At least 8 characters"
            bind:value={passwordForm.password}
            required
          />
          <p class="text-xs text-muted-foreground">
            Must be at least 8 characters
          </p>
        </div>
        <div class="space-y-2">
          <label for="confirm-password" class="text-sm font-medium"
            >Confirm Password</label
          >
          <Input
            id="confirm-password"
            name="confirmPassword"
            type="password"
            placeholder="Confirm your new password"
            bind:value={passwordForm.confirmPassword}
            required
          />
        </div>
        <Button
          type="submit"
          disabled={passwordForm.isSubmitting}
          class="w-full sm:w-auto"
        >
          {passwordForm.isSubmitting ? "Updating..." : "Update Password"}
        </Button>
      </form>
    </Card.Content>
  </Card.Root>

  <!-- Delete All Scrobbles Section -->
  <Card.Root class="border-destructive">
    <Card.Header>
      <Card.Title class="text-destructive">Delete All Scrobbles</Card.Title>
      <Card.Description
        >Permanently remove all your scrobble history</Card.Description
      >
    </Card.Header>
    <Card.Content>
      <Button
        variant="destructive"
        onclick={() => (showDeleteScrobblesModal = true)}
        class="w-full sm:w-auto"
      >
        Delete All Scrobbles
      </Button>
    </Card.Content>
  </Card.Root>

  <!-- Delete Account Section -->
  <Card.Root class="border-destructive">
    <Card.Header>
      <Card.Title class="text-destructive">Delete Account</Card.Title>
      <Card.Description
        >Permanently delete your account and all associated data</Card.Description
      >
    </Card.Header>
    <Card.Content>
      <Button
        variant="destructive"
        onclick={() => (showDeleteAccountModal = true)}
        class="w-full sm:w-auto"
      >
        Delete Account
      </Button>
    </Card.Content>
  </Card.Root>
</div>

<!-- Delete Scrobbles Modal -->
{#if showDeleteScrobblesModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <Card.Root class="w-full max-w-md">
      <Card.Header>
        <Card.Title class="text-destructive">Delete All Scrobbles?</Card.Title>
      </Card.Header>
      <Card.Content class="space-y-4">
        <p class="text-sm text-muted-foreground">
          This action cannot be undone. All your scrobbles will be permanently
          deleted.
        </p>
        <div class="rounded bg-muted p-3">
          <p class="text-xs font-mono">DELETE_ALL_SCROBBLES</p>
        </div>
        <p class="text-xs text-muted-foreground">
          Type the confirmation text above to confirm:
        </p>
        <Input
          type="text"
          placeholder="Confirmation text"
          bind:value={deleteScrobblesConfirmation}
        />
        <div class="flex gap-2">
          <Button
            variant="outline"
            onclick={() => {
              showDeleteScrobblesModal = false;
              deleteScrobblesConfirmation = "";
            }}
            class="flex-1 sm:flex-none"
          >
            Cancel
          </Button>
          <form
            method="POST"
            action="?/deleteAllScrobbles"
            use:enhance={handleDeleteScrobbles()}
            class="flex-1 sm:flex-none"
          >
            <input
              type="hidden"
              name="confirmation"
              value={deleteScrobblesConfirmation}
            />
            <Button
              type="submit"
              variant="destructive"
              disabled={deleteScrobblesConfirmation !== "DELETE_ALL_SCROBBLES"}
              class="w-full"
            >
              Delete All
            </Button>
          </form>
        </div>
      </Card.Content>
    </Card.Root>
  </div>
{/if}

<!-- Delete Account Modal -->
{#if showDeleteAccountModal}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <Card.Root class="w-full max-w-md">
      <Card.Header>
        <Card.Title class="text-destructive">Delete Account?</Card.Title>
      </Card.Header>
      <Card.Content class="space-y-4">
        <p class="text-sm text-muted-foreground">
          This action cannot be undone. Your account and all data will be
          permanently deleted.
        </p>
        <div class="rounded bg-muted p-3">
          <p class="text-xs font-mono">DELETE_ACCOUNT</p>
        </div>
        <p class="text-xs text-muted-foreground">
          Type the confirmation text above to confirm:
        </p>
        <Input
          type="text"
          placeholder="Confirmation text"
          bind:value={deleteAccountConfirmation}
        />
        <div class="flex gap-2">
          <Button
            variant="outline"
            onclick={() => {
              showDeleteAccountModal = false;
              deleteAccountConfirmation = "";
            }}
            class="flex-1 sm:flex-none"
          >
            Cancel
          </Button>
          <form
            method="POST"
            action="?/deleteAccount"
            use:enhance={handleDeleteAccount()}
            class="flex-1 sm:flex-none"
          >
            <input
              type="hidden"
              name="confirmation"
              value={deleteAccountConfirmation}
            />
            <Button
              type="submit"
              variant="destructive"
              disabled={deleteAccountConfirmation !== "DELETE_ACCOUNT"}
              class="w-full"
            >
              Delete
            </Button>
          </form>
        </div>
      </Card.Content>
    </Card.Root>
  </div>
{/if}
