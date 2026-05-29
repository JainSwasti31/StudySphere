import { Link } from "react-router-dom";

const RoomCard = ({ room, onCopyInvite }) => {
  return (
    <article className="room-card">
      <div className="room-card__header">
        <div>
          <p className="room-card__label">Study room</p>
          <h3>{room.name}</h3>
        </div>
        <span className="room-card__count">{room.members?.length || 0} members</span>
      </div>

      <p className="room-card__description">{room.description || "No description provided."}</p>

      <div className="room-card__topic">
        <span>Topic</span>
        <strong>{room.topic || "General"}</strong>
      </div>

      <div className="room-card__invite">
        <span>Invite code</span>
        <button type="button" className="copy-button" onClick={() => onCopyInvite(room.inviteCode)}>
          {room.inviteCode}
        </button>
      </div>

      <div className="room-card__actions">
        <Link className="primary-link" to={`/rooms/${room.id}`}>
          Enter room
        </Link>
      </div>
    </article>
  );
};

export default RoomCard;