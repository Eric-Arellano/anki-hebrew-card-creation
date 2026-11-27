<script lang="ts">
let { id, value }: { id: string; value: string } = $props();
</script>

<!-- `<bdi>`, since the value is whatever the note holds, which may be Hebrew, inside an English
     sentence. -->
<p {id} class="basis-full text-sm text-red-400">
  The note has “<bdi>{value}</bdi>”, which isn't one of these. Choose one.
</p>
