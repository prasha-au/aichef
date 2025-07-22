export default function Login() {
  return <div className="d-flex flex-column align-items-center justify-content-center" style={{height:'100vh'}}>
    <div className="bg-dark text-light p-4 rounded shadow" style={{minWidth:320}}>
      <h3 className="mb-3">Please log in</h3>
      <p className="mb-4">You must be signed in to use this app so I can enforce usage limits.<br />Please enable popups.</p>
    </div>
  </div>;
}
