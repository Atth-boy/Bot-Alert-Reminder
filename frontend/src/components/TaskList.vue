<script setup>
defineProps({ tasks: Array })

function fmt(v) {
  return v ? String(v).slice(0, 10) : '-'
}
</script>

<template>
  <ul class="list">
    <li v-for="t in tasks" :key="t._row" class="card">
      <h3>{{ t.Topic }}</h3>
      <p v-if="t.Detail">{{ t.Detail }}</p>
      <small>Due: {{ fmt(t['Due Date']) }} · Notify: {{ fmt(t['Notification Date']) }}</small>
      <small>Recipient: {{ t.Recipient }}</small>
    </li>
    <li v-if="!tasks.length" class="empty">ไม่มีรายการ</li>
  </ul>
</template>
