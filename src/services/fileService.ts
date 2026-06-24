import { documentDirectory, makeDirectoryAsync, getInfoAsync, copyAsync, deleteAsync } from 'expo-file-system/legacy';

const PRESCRIPTION_DIR = `${documentDirectory}prescriptions/`;

// Ensure directory exists
export const ensureDirectoryExists = async () => {
  const dirInfo = await getInfoAsync(PRESCRIPTION_DIR);
  if (!dirInfo.exists) {
    await makeDirectoryAsync(PRESCRIPTION_DIR, { intermediates: true });
  }
};

// Save a file locally to the persistent directory
export const saveFileLocally = async (tempUri: string, originalFileName: string): Promise<string | null> => {
  try {
    await ensureDirectoryExists();

    const timestamp = Date.now();
    // Clean file name
    const cleanedName = originalFileName.replace(/[^a-zA-Z0-9.]/g, '_');
    const localFileName = `${timestamp}_${cleanedName}`;
    const destinationUri = `${PRESCRIPTION_DIR}${localFileName}`;

    await copyAsync({
      from: tempUri,
      to: destinationUri,
    });

    return destinationUri;
  } catch (error) {
    console.error('Error saving file locally:', error);
    return null;
  }
};

// Delete local file
export const deleteLocalFile = async (fileUri: string): Promise<boolean> => {
  try {
    const fileInfo = await getInfoAsync(fileUri);
    if (fileInfo.exists) {
      await deleteAsync(fileUri);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting local file:', error);
    return false;
  }
};
