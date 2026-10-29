<script lang="ts">
let {
  label,
  lang,
  value = $bindable(),
}: {
  label: string;
  lang: 'he' | 'en';
  value: string;
} = $props();
</script>

<label class="grid gap-1">
  <span class="required-mark">{label}</span>
  <input class="text-2xl" {lang} dir={lang === 'he' ? 'rtl' : 'ltr'} required bind:value>
</label>
