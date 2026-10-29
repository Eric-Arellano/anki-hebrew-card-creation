<script lang="ts">
let {
  label,
  lang,
  required = true,
  value = $bindable(),
}: {
  label: string;
  lang: 'he' | 'en';
  required?: boolean;
  value: string;
} = $props();
</script>

<label class="grid gap-1">
  <span class={{ 'required-mark': required }}>{label}</span>
  <input class="text-2xl" {lang} dir={lang === 'he' ? 'rtl' : 'ltr'} {required} bind:value>
</label>
