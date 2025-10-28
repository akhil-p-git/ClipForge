import { create } from 'zustand';

export const useStore = create((set) => ({
  // Clips in media library
  clips: [],
  
  // Clips on timeline
  timelineClips: [],
  
  // Current playback state
  playhead: 0,
  isPlaying: false,
  currentClip: null,
  
  // Trim state
  inPoint: null,
  outPoint: null,
  
  // Actions
  addClip: (clip) => set((state) => ({ 
    clips: [...state.clips, clip] 
  })),
  
  addToTimeline: (timelineClip) => set((state) => ({ 
    timelineClips: [...state.timelineClips, timelineClip] 
  })),
  
  setPlayhead: (time) => set({ playhead: time }),
  
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  
  setCurrentClip: (clip) => {
    console.log('=== SETTING CURRENT CLIP ===');
    console.log('Clip:', clip);
    set({ currentClip: clip });
    console.log('State updated');
  },
  
  updateClip: (clipId, updates) => set((state) => ({
    clips: state.clips.map(clip => 
      clip.id === clipId ? { ...clip, ...updates } : clip
    )
  })),
  
  removeClip: (clipId) => set((state) => ({
    clips: state.clips.filter(clip => clip.id !== clipId)
  })),
  
  removeTimelineClip: (timelineClipId) => set((state) => ({
    timelineClips: state.timelineClips.filter(clip => clip.id !== timelineClipId)
  })),
  
  updateTimelineClip: (clipId, updates) => set((state) => ({
    timelineClips: state.timelineClips.map(clip => 
      clip.id === clipId ? { ...clip, ...updates } : clip
    )
  })),
  
  setInPoint: (time) => set({ inPoint: time }),
  setOutPoint: (time) => set({ outPoint: time }),
  clearTrimPoints: () => set({ inPoint: null, outPoint: null }),
}));

