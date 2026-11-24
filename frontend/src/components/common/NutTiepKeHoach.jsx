import { Link } from "react-router-dom";
import { dangTheoKeHoach } from "../../utils/keHoachHomNay";

/** Ở màn kết thúc một bước: đang học theo "Học hôm nay" thì có nút quay về làm việc kế tiếp */
function NutTiepKeHoach({ className = "" }) {
  if (!dangTheoKeHoach()) return null;
  return (
    <div className={`nut-tiep-ke-hoach ${className}`.trim()}>
      <Link to="/hoc-hom-nay" className="ui-button ui-button--primary">
        Tiếp kế hoạch hôm nay →
      </Link>
    </div>
  );
}

export default NutTiepKeHoach;
