<script setup>
defineProps({ tasks: Array })
const emit = defineEmits(['delete', 'done'])

function fmt(v) {
  return v ? String(v).slice(0, 10) : '-'
}
</script>

<template>
  <ul class="list">
    <li v-for="t in tasks" :key="t._row" class="card">
      <div class="card-head">
        <h3>{{ t.Topic }}</h3>
        <div class="actions">
          <button
            v-if="t.Status !== 'Done'"
            class="btn-done"
            title="ทำเสร็จแล้ว"
            @click="emit('done', t._row)"
          >✓</button>
          <button
            class="btn-delete"
            title="ลบรายการ"
            @click="emit('delete', t._row)"
          >✕</button>
        </div>
      </div>
      <p v-if="t.Detail">{{ t.Detail }}</p>
      <small>Due: {{ fmt(t['Due Date']) }} · Notify: {{ fmt(t['Notification Date']) }}</small>
      <small>Recipient: {{ t.Recipient }}</small>
      <div class="badges">
        <span v-if="t.Recurrence === 'monthly'" class="badge recurring">ทุกเดือน</span>
        <span v-if="t.Status === 'Done'" class="badge done">เสร็จแล้ว</span>
      </div>
    </li>
    <li v-if="!tasks.length" class="empty">ไม่มีรายการ</li>
  </ul>
</template>

<style scoped>
.card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}
.actions { display: flex; gap: 0.3rem; flex-shrink: 0; }
.actions button {
  width: 28px;
  height: 28px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: bold;
  line-height: 1;
  padding: 0;
}
.btn-done { color: #06c755; }
.btn-done:hover { background: #06c755; color: white; border-color: #06c755; }
.btn-delete { color: #999; }
.btn-delete:hover { background: #d32f2f; color: white; border-color: #d32f2f; }
.badges { display: flex; gap: 0.3rem; margin-top: 0.4rem; }
.badge {
  display: inline-block;
  padding: 0.15rem 0.5rem;
  border-radius: 10px;
  font-size: 0.75rem;
}
.badge.done { background: #e8f5e9; color: #06c755; }
.badge.recurring { background: #e3f2fd; color: #1976d2; }
</style>
