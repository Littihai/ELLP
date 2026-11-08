# Security

ELLP 1.0.0 is a demo. Before any public deployment:

- Keep `Auth:Mode=Firebase` and `Store:Mode=Firestore`; the API refuses the demo modes outside Development.
- Keep Firestore client rules closed (`firebase/firestore.rules`); every data access goes through the API.
- Keep email test mode on until real delivery is wanted; two switches must be turned off (`Email:GlobalTestMode`, tenant setting).
- Secrets only in the environment: `EMAIL_PASSWORD`, `GOOGLE_APPLICATION_CREDENTIALS`. Never commit a service-account JSON.
- Rotate any key that was ever committed by mistake, even for a minute.
- Children's data: collect the minimum (display name, a parent's email), and read the applicable law (PDPA in Thailand, COPPA if
  US children) before storing more.

To report a problem, open a private security advisory on the GitHub repository or write to the owner's contact address.
