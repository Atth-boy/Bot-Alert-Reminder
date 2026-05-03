<script setup>
import { ref, watch, computed } from 'vue'
import { addTask } from '../api'

const emit = defineEmits(['added'])

const empty = () => ({
  topic: '',
  detail: '',
  dueDate: '',
  recipient: '',
  notificationDate: '',
  recurrence: 'none'
})

const form = ref(empty())
const saving = ref(false)
const error = ref('')

watch(() => form.value.dueDate, (d) => {
  if (d && !form.value.notificationDate) {
    const date = new Date(d)
    date.setDate(date.getDate() - 1)
    form.value.notificationDate = date.toISOString().slice(0, 10)
  }
})

const notifyDay = computed(() => {
  if (!form.value.notificationDate) return '?'
  return new Date(form.value.notificationDate).getDate()
})

async function submit() {
  saving.value = true
  error.value = ''
  try {
    await addTask(form.value)
    form.value = empty()
    emit('added')
  } catch (e) {
    error.value = e.message
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <form @submit.prevent="submit" class="form">
    <input v-model="form.topic" placeholder="Topic (หัวข้อ)" required />
    <textarea v-model="form.detail" placeholder="รายละเอียด" rows="2"></textarea>

    <label>
      รูปแบบการแจ้งเตือน
      <select v-model="form.recurrence">
        <option value="none">ครั้งเดียว</option>
        <option value="monthly">ทุกเดือน</option>
      </select>
    </label>

    <label>
      {{ form.recurrence === 'monthly' ? 'Due Date (วันสิ้นสุด — ทิ้งว่างได้)' : 'Due Date' }}
      <input
        type="date"
        v-model="form.dueDate"
        :required="form.recurrence === 'none'"
      />
    </label>

    <input v-model="form.recipient" placeholder="LINE User ID / Group ID" required />

    <label>
      {{ form.recurrence === 'monthly' ? 'วันที่แจ้ง (ใช้วันใน-เดือน)' : 'Notification Date (default: Due Date - 1 วัน)' }}
      <input type="date" v-model="form.notificationDate" :required="form.recurrence === 'monthly'" />
    </label>

    <small v-if="form.recurrence === 'monthly'" class="hint">
      จะแจ้งทุกวันที่ {{ notifyDay }} ของเดือน (เดือนสั้นจะ fallback เป็นวันสุดท้าย)
    </small>

    <button :disabled="saving">{{ saving ? 'กำลังบันทึก...' : 'บันทึก' }}</button>
    <div v-if="error" class="error">{{ error }}</div>
  </form>
</template>

<style scoped>
.hint { color: #666; font-size: 0.8rem; }
select {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  width: 100%;
  background: white;
}
</style>
