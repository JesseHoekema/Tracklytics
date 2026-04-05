<script lang="ts">
  import * as Card from "$lib/components/ui/card/index.js";
  import Input from "$lib/components/ui/input/input.svelte";
  import Label from "$lib/components/ui/label/label.svelte";
  import Button from "$lib/components/ui/button/button.svelte";
</script>

<Card.Root>
  <Card.Header>
    <Card.Title>Last.fm</Card.Title>
    <Card.Description>
      Connect your Last.fm account to import your listening history and get all
      your listening data in one place.
    </Card.Description>
  </Card.Header>
  <Card.Content>
    <div class="grid w-full items-center gap-4">
      <div class="grid w-full items-center gap-2">
        <Label for="username">Last.fm Username</Label>
        <Input id="username" placeholder="Enter your Last.fm username" />
      </div>
      <Button>Connect Last.fm</Button>
    </div>
  </Card.Content>
</Card.Root>
