import { useAuth } from "@clerk/react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";


function Navrbar() {
  const { getToken, isSignedIn } = useAuth();

  const { data } = useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch("/api/me", { getToken }),
    enabled: isSignedIn
  })

  console.log(data);


  return <div>Navrbar</div>;

}

export default Navrbar;