<script setup>
import { ref, watch } from 'vue'
import { addTask } from '../api'

const emit = defineEmits(['added'])

const empty = () => ({
  topic: '',
  detail: '',
  dueDate: '',
  recipient: '',
  notificationDate: ''
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
      Due Date
      <input type="date" v-model="form.dueDate" required />
    </label>
    <input v-model="form.recipient" placeholder="LINE User ID / Group ID" required />
    <label>
      Notification Date (default: Due Date - 1 วัน)
      <input type="date" v-model="form.notificationDate" />
    </label>
    <button :disabled="saving">{{ saving ? 'กำลังบันทึก...' : 'บันทึก' }}</button>
    <div v-if="error" class="error">{{ error }}</div>
  </form>
</template>
