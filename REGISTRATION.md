# Mission 0 registration

Run `python server.py --port 8001` and open `http://localhost:8001/`. A plain static file server cannot save registrations.

The three Mission 0 CTAs open the native accessible dialog in `registration.js`, styled by `registration.css`. The form submits JSON to `POST /api/registrations`. Server validation mirrors the form choices. A success state appears only after SQLite has committed the registration. Retry requests use the same UUID so a lost response does not create duplicate records.

Records are stored in `.local/registrations.sqlite3`, excluded from Git and blocked from HTTP access. They can be read locally with SQLite. No WhatsApp messages are sent automatically. The Zola team must review the records and contact parents.

For public launch, host the endpoint with HTTPS and durable storage or replace the endpoint with your registration service. This bundled server is a local preview service, listening only on this computer.
