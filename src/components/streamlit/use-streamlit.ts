import { Streamlit } from 'streamlit-component-lib'
import { onMounted, onUpdated } from 'vue'

export function useStreamlit() {
  onMounted((): void => {
    Streamlit.setFrameHeight()
  })

  onUpdated((): void => {
    Streamlit.setFrameHeight()
  })
}
