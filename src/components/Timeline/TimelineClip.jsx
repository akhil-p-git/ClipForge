import React from 'react';
import { useDrag } from 'react-dnd';

function TimelineClip({ clip, sourceClip, updateClip, onRemove }) {
  const [{ isDragging }, drag] = useDrag({
    type: 'timeline-clip',
    item: { clip },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  return (
    <div
      ref={drag}
      className={`clip-block ${clip.trackId === 1 ? 'overlay' : ''}`}
      style={{
        left: `${(clip.startTime / 60) * 100}%`,
        width: `${(clip.duration / 60) * 100}%`,
        position: 'absolute',
        opacity: isDragging ? 0.5 : 1,
        cursor: 'move',
      }}
    >
      <span className="clip-name">{sourceClip?.fileName || 'Clip'}</span>
      {onRemove && (
        <button
          className="timeline-clip-remove"
          onClick={(e) => {
            e.stopPropagation();
            if (onRemove) {
              onRemove(clip.id);
            }
          }}
          title="Remove from timeline"
        >
          ×
        </button>
      )}
    </div>
  );
}

export default TimelineClip;

