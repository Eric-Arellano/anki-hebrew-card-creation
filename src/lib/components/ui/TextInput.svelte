<script lang="ts">
let {
  label,
  lang,
  placeholder,
  value = $bindable(),
}: {
  label: string;
  lang: 'he' | 'en';
  placeholder: string;
  value: string;
} = $props();
</script>

<label class="grid gap-1">
  <span class="required-mark">{label}</span>
  <input
    class="text-2xl"
    {lang}
    dir={lang === 'he' ? 'rtl' : 'ltr'}
    {placeholder}
    required
    bind:value
  >
</label>
