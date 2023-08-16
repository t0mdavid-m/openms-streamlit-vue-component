import { Streamlit } from 'streamlit-component-lib'
import { onMounted, onUpdated } from 'vue'

export default () => {
  onMounted((): void => {
    Streamlit.setFrameHeight()
    //Streamlit.setComponentValue('')
  })

  onUpdated((): void => {
    Streamlit.setFrameHeight()
    Streamlit.setComponentValue('')
  })
}
