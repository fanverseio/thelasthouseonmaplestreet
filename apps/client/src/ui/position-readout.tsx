import { formatReadout } from '../game/position-readout.ts';
import { useGame, useSettings } from '../store/index.ts';

/** Testing aid: Elena's position and facing, top right. Toggle in Settings. */
export function PositionReadout() {
  const show = useSettings((s) => s.showPosition);
  const pos = useGame((s) => s.player.pos);
  const yaw = useGame((s) => s.player.yaw);
  const scene = useGame((s) => s.game.scene);
  if (!show) return null;
  return (
    <div className="position-readout" aria-hidden="true">
      {formatReadout(pos[0], pos[2], yaw)}
      <small>{scene === 'last_house' ? 'Last House' : 'Street'} · +x east, +z south</small>
    </div>
  );
}
