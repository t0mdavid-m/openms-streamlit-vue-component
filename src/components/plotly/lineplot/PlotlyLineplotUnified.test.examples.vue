<template>
  <div class="test-examples-container">
    <h1>PlotlyLineplotUnified Test Examples</h1>
    
    <!-- Example 1: Basic Mode (Legacy PlotlyLineplot compatibility) -->
    <section class="test-section">
      <h2>1. Basic Mode - Legacy PlotlyLineplot Compatibility</h2>
      <PlotlyLineplotUnified
        :args="basicModeArgs"
        :index="1"
        @plot-rendered="onPlotRendered('basic')"
        @plot-error="onPlotError('basic')"
      />
    </section>
    
    <!-- Example 2: Enhanced Mode (Legacy PlotlyLineplotTagger compatibility) -->
    <section class="test-section">
      <h2>2. Enhanced Mode - Legacy PlotlyLineplotTagger Compatibility</h2>
      <PlotlyLineplotUnified
        :args="enhancedModeArgs"
        :index="2"
        legacy-mode="enhanced"
        @plot-rendered="onPlotRendered('enhanced')"
        @plot-error="onPlotError('enhanced')"
        @mass-selected="onMassSelected"
        @zoom-changed="onZoomChanged"
        @back-button-clicked="onBackButtonClicked"
      />
    </section>
    
    <!-- Example 3: Auto Mode with Feature Flags -->
    <section class="test-section">
      <h2>3. Auto Mode with Custom Feature Configuration</h2>
      <PlotlyLineplotUnified
        :args="autoModeArgs"
        :index="3"
        @plot-rendered="onPlotRendered('auto')"
        @plot-error="onPlotError('auto')"
        @mode-changed="onModeChanged"
        @feature-toggled="onFeatureToggled"
      />
    </section>
    
    <!-- Example 4: Custom Styling -->
    <section class="test-section">
      <h2>4. Enhanced Mode with Custom Styling</h2>
      <PlotlyLineplotUnified
        :args="customStyledArgs"
        :index="4"
        @plot-rendered="onPlotRendered('styled')"
        @plot-error="onPlotError('styled')"
      />
    </section>
    
    <!-- Example 5: Error Handling Demo -->
    <section class="test-section">
      <h2>5. Error Handling - Invalid Data</h2>
      <PlotlyLineplotUnified
        :args="invalidDataArgs"
        :index="5"
        @plot-rendered="onPlotRendered('error-test')"
        @plot-error="onPlotError('error-test')"
      />
    </section>
    
    <!-- Event Log -->
    <section class="test-section">
      <h2>Event Log</h2>
      <div class="event-log">
        <div 
          v-for="(event, index) in eventLog" 
          :key="index" 
          :class="['event-entry', `event-${event.type}`]"
        >
          <strong>{{ event.timestamp }}</strong> - 
          <span class="event-type">{{ event.type }}</span>: 
          <span class="event-data">{{ JSON.stringify(event.data) }}</span>
        </div>
      </div>
    </section>
    
    <!-- Mode Switching Demo -->
    <section class="test-section">
      <h2>6. Dynamic Mode Switching</h2>
      <div class="mode-controls">
        <button @click="switchMode('basic')">Switch to Basic</button>
        <button @click="switchMode('enhanced')">Switch to Enhanced</button>
        <button @click="switchMode('auto')">Switch to Auto</button>
        <button @click="toggleFeature('massHighlighting')">Toggle Mass Highlighting</button>
        <button @click="toggleFeature('zoomControls')">Toggle Zoom Controls</button>
      </div>
      <PlotlyLineplotUnified
        :args="dynamicModeArgs"
        :index="6"
        ref="dynamicComponent"
        @plot-rendered="onPlotRendered('dynamic')"
        @plot-error="onPlotError('dynamic')"
        @mode-changed="onModeChanged"
      />
    </section>
    
    <!-- Example 7: Mass Index Highlighting Test -->
    <section class="test-section">
      <h2>7. Mass Index Highlighting Test - Deconvolved Spectrum Only</h2>
      <div class="test-controls">
        <button @click="setMassIndex(0)">Highlight Mass Index 0</button>
        <button @click="setMassIndex(1)">Highlight Mass Index 1</button>
        <button @click="setMassIndex(2)">Highlight Mass Index 2</button>
        <button @click="clearMassIndex()">Clear Highlighting</button>
        <button @click="toggleSpectrumType()">
          Switch to {{ massIndexTestArgs.title === 'Deconvolved Spectrum' ? 'Augmented Deconvolved Spectrum' : 'Deconvolved Spectrum' }}
        </button>
      </div>
      <p><strong>Current Mass Index:</strong> {{ currentMassIndex ?? 'None' }}</p>
      <p><strong>Title:</strong> {{ massIndexTestArgs.title }}</p>
      <p><strong>Expected:</strong> Highlighting should only work when title is "Deconvolved Spectrum"</p>
      <PlotlyLineplotUnified
        :args="massIndexTestArgs"
        :index="7"
        @plot-rendered="onPlotRendered('mass-index-test')"
        @plot-error="onPlotError('mass-index-test')"
      />
    </section>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, reactive } from 'vue'
import PlotlyLineplotUnified from './PlotlyLineplotUnified.vue'
import type { UnifiedPlotlyLineArguments } from './plotly-lineplot-unified'
import { useSelectionStore } from '@/stores/selection'

interface EventLogEntry {
  timestamp: string
  type: string
  data: any
}

export default defineComponent({
  name: 'PlotlyLineplotUnifiedTestExamples',
  components: {
    PlotlyLineplotUnified
  },
  setup() {
    const eventLog = ref<EventLogEntry[]>([])
    const selectionStore = useSelectionStore()
    const currentMassIndex = ref<number | undefined>(undefined)
    
    // Example 1: Basic Mode Args (Legacy PlotlyLineplot)
    const basicModeArgs = reactive<UnifiedPlotlyLineArguments>({
      componentName: 'PlotlyLineplotUnified',
      title: 'Deconvolved Spectrum',
      mode: 'basic'
    })
    
    // Example 2: Enhanced Mode Args (Legacy PlotlyLineplotTagger)
    const enhancedModeArgs = reactive<UnifiedPlotlyLineArguments>({
      componentName: 'PlotlyLineplotUnified',
      title: 'Augmented Deconvolved Spectrum',
      mode: 'enhanced',
      features: {
        interactiveMode: true,
        massHighlighting: true,
        tagHighlighting: true,
        zoomControls: true,
        annotationSystem: true,
        massSelection: true,
        backButton: true,
        clickEvents: true,
        sequenceVisualization: true
      }
    })
    
    // Example 3: Auto Mode with Custom Features
    const autoModeArgs = reactive<UnifiedPlotlyLineArguments>({
      componentName: 'PlotlyLineplotUnified',
      title: 'Auto-Detected Spectrum',
      mode: 'auto',
      features: {
        massHighlighting: true,
        zoomControls: true,
        clickEvents: false, // Selectively disable features
        annotationSystem: true
      },
      config: {
        xPosScalingFactor: 25.0,
        xPosScalingThreshold: 35,
        enableManualZoom: true,
        showChargeLabels: true
      }
    })
    
    // Example 4: Custom Styling
    const customStyledArgs = reactive<UnifiedPlotlyLineArguments>({
      componentName: 'PlotlyLineplotUnified',
      title: 'Custom Styled Spectrum',
      mode: 'enhanced',
      features: {
        massHighlighting: true,
        annotationSystem: true
      },
      styling: {
        highlightColor: '#FF6B6B',
        selectedColor: '#4ECDC4',
        unhighlightedColor: '#A8E6CF',
        annotationColors: {
          massButton: '#FF6B6B',
          selectedMassButton: '#4ECDC4',
          sequenceArrow: '#45B7D1',
          selectedSequenceArrow: '#4ECDC4'
        }
      }
    })
    
    // Example 5: Invalid Data (for error testing)
    const invalidDataArgs = reactive<UnifiedPlotlyLineArguments>({
      componentName: 'PlotlyLineplotUnified',
      title: 'Error Test Spectrum',
      mode: 'enhanced'
      // Intentionally missing required data to trigger fallback
    })
    
    // Example 6: Dynamic Mode Switching
    const dynamicModeArgs = reactive<UnifiedPlotlyLineArguments>({
      componentName: 'PlotlyLineplotUnified',
      title: 'Dynamic Mode Spectrum',
      mode: 'basic',
      features: {
        massHighlighting: true,
        zoomControls: true
      }
    })
    
    // Example 7: Mass Index Highlighting Test
    const massIndexTestArgs = reactive<UnifiedPlotlyLineArguments>({
      componentName: 'PlotlyLineplotUnified',
      title: 'Deconvolved Spectrum',
      mode: 'enhanced',
      features: {
        massHighlighting: true,
        zoomControls: true
      }
    })
    
    // Event handlers
    const logEvent = (type: string, data: any) => {
      eventLog.value.unshift({
        timestamp: new Date().toLocaleTimeString(),
        type,
        data
      })
      
      // Keep only last 50 events
      if (eventLog.value.length > 50) {
        eventLog.value = eventLog.value.slice(0, 50)
      }
    }
    
    const onPlotRendered = (source: string) => (data: any) => {
      logEvent(`plot-rendered (${source})`, data)
    }
    
    const onPlotError = (source: string) => (data: any) => {
      logEvent(`plot-error (${source})`, data)
    }
    
    const onMassSelected = (data: any) => {
      logEvent('mass-selected', data)
    }
    
    const onZoomChanged = (data: any) => {
      logEvent('zoom-changed', data)
    }
    
    const onBackButtonClicked = (data: any) => {
      logEvent('back-button-clicked', data)
    }
    
    const onModeChanged = (data: any) => {
      logEvent('mode-changed', data)
    }
    
    const onFeatureToggled = (data: any) => {
      logEvent('feature-toggled', data)
    }
    
    // Dynamic controls
    const switchMode = (mode: 'basic' | 'enhanced' | 'auto') => {
      dynamicModeArgs.mode = mode
      logEvent('mode-switch-requested', { mode })
    }
    
    const toggleFeature = (feature: string) => {
      if (!dynamicModeArgs.features) {
        dynamicModeArgs.features = {}
      }
      
      const features = dynamicModeArgs.features as Record<string, boolean>
      const currentValue = features[feature] || false
      features[feature] = !currentValue
      
      logEvent('feature-toggle-requested', { feature, newValue: !currentValue })
    }
    
    // Mass index test controls
    const setMassIndex = (index: number) => {
      currentMassIndex.value = index
      selectionStore.updateSelectedMass(index)
      logEvent('mass-index-set', { index })
    }
    
    const clearMassIndex = () => {
      currentMassIndex.value = undefined
      selectionStore.updateSelectedMass(undefined)
      logEvent('mass-index-cleared', {})
    }
    
    const toggleSpectrumType = () => {
      if (massIndexTestArgs.title === 'Deconvolved Spectrum') {
        massIndexTestArgs.title = 'Augmented Deconvolved Spectrum'
      } else {
        massIndexTestArgs.title = 'Deconvolved Spectrum'
      }
      logEvent('spectrum-type-toggled', { newTitle: massIndexTestArgs.title })
    }
    
    return {
      eventLog,
      basicModeArgs,
      enhancedModeArgs,
      autoModeArgs,
      customStyledArgs,
      invalidDataArgs,
      dynamicModeArgs,
      onPlotRendered,
      onPlotError,
      onMassSelected,
      onZoomChanged,
      onBackButtonClicked,
      onModeChanged,
      onFeatureToggled,
      switchMode,
      toggleFeature,
      massIndexTestArgs,
      currentMassIndex,
      setMassIndex,
      clearMassIndex,
      toggleSpectrumType
    }
  }
})
</script>

<style scoped>
.test-examples-container {
  padding: 20px;
  font-family: Arial, sans-serif;
}

.test-section {
  margin-bottom: 40px;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background-color: #f9f9f9;
}

.test-section h2 {
  margin-top: 0;
  color: #333;
  border-bottom: 2px solid #007bff;
  padding-bottom: 10px;
}

.event-log {
  max-height: 300px;
  overflow-y: auto;
  background-color: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 10px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
}

.event-entry {
  margin-bottom: 5px;
  padding: 5px;
  border-radius: 3px;
}

.event-plot-rendered {
  background-color: #d4edda;
  border-left: 4px solid #28a745;
}

.event-plot-error {
  background-color: #f8d7da;
  border-left: 4px solid #dc3545;
}

.event-mass-selected,
.event-zoom-changed,
.event-back-button-clicked {
  background-color: #d1ecf1;
  border-left: 4px solid #17a2b8;
}

.event-mode-changed,
.event-feature-toggled {
  background-color: #fff3cd;
  border-left: 4px solid #ffc107;
}

.event-type {
  font-weight: bold;
  color: #495057;
}

.event-data {
  color: #6c757d;
}

.mode-controls,
.test-controls {
  margin-bottom: 20px;
}

.mode-controls button,
.test-controls button {
  margin-right: 10px;
  margin-bottom: 10px;
  padding: 8px 16px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.mode-controls button:hover,
.test-controls button:hover {
  background-color: #0056b3;
}

.mode-controls button:active,
.test-controls button:active {
  background-color: #004085;
}

.test-controls p {
  margin: 5px 0;
  font-weight: bold;
  color: #495057;
}

/* Responsive design */
@media (max-width: 768px) {
  .test-examples-container {
    padding: 10px;
  }
  
  .test-section {
    padding: 15px;
    margin-bottom: 20px;
  }
  
  .mode-controls button,
  .test-controls button {
    display: block;
    width: 100%;
    margin-bottom: 10px;
  }
}
</style>