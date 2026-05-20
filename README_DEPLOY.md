# InfinityFree Deployment Guide

To deploy this application to InfinityFree:

1. **Build the Project**:
   Run the following command in your terminal:
   ```bash
   npm run build
   ```

2. **Upload Files**:
   Connect to your InfinityFree account via FTP (using a tool like FileZilla) or use their Online File Manager.
   
3. **Target Directory**:
   Go to the `htdocs` folder of your domain.

4. **Transfer**:
   Upload **the contents** of the `dist` folder (local) into the `htdocs` folder (server).
   
   *Note: Do not upload the `dist` folder itself, only what is inside it.*

5. **Routing**:
   The included `.htaccess` file will automatically handle routing so that your pages (Archive, Galleries, etc.) work correctly when refreshed.

### Note on API Keys:
The `GEMINI_API_KEY` is baked into the JavaScript build during `npm run build`. Ensure your environment variables are set correctly before building.
