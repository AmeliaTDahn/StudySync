import { supabase } from './supabase';

// Upload a file to S3 using pre-signed URL
export async function uploadFile(file: File) {
  try {
    // Get the current user's session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      throw new Error('Not authenticated');
    }

    // Get pre-signed URL from our API
    const response = await fetch('/api/s3/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get upload URL');
    }

    const { url, key } = await response.json();

    // Upload file to S3
    const uploadResponse = await fetch(url, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type
      }
    });

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload file');
    }

    return { key, fileName: file.name };
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
}

// Delete a file from S3
export async function deleteFile(key: string) {
  try {
    // Get the current user's session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      throw new Error('Not authenticated');
    }

    // Call delete API
    const response = await fetch('/api/s3/delete', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ key })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete file');
    }

    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
} 