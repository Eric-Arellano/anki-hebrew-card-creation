<script lang="ts">
let { id, value }: { id: string; value: string } = $props();
</script>

<!-- `<bdi>`, since the value may be Hebrew, as a preposition is, inside an English sentence. -->
<p {id} class="basis-full text-sm text-red-700">
  The note has “<bdi>{value}</bdi>”, which isn't one of these. Choose one.
</p>
