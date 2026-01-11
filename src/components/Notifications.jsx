import React from 'react'

export default function Notifications({ league }){
  const notes = (league.notifications || []).slice(0,50)
  return (
    <div className="panel notifications-panel">
      <div className="panel-header"><h2>Notifications</h2></div>
      <div style={{display:'grid',gap:8,marginTop:8}}>
        {notes.map(n=> (
          <div key={n.id} className={"note" + (n.read ? '' : ' unread')}>
            <div>{n.text}</div>
            <div className="note-time">{new Date(n.time).toLocaleString()}</div>
          </div>
        ))}
        {notes.length===0 && <div className="note muted">No notifications</div>}
      </div>
    </div>
  )
}
