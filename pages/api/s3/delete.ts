import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { deleteObject } from '../../../lib/aws-server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get auth token from header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    // Verify the token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get file key from request body
    const { key } = req.body;
    if (!key) {
      return res.status(400).json({ error: 'Missing file key' });
    }

    // Verify the user has access to delete this file
    if (!key.includes(`uploads/${user.id}/`) && !user.user_metadata?.isAdmin) {
      return res.status(403).json({ error: 'Access denied to delete this file' });
    }

    // Delete the file
    await deleteObject(key);

    return res.status(200).json({ 
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    return res.status(500).json({ error: 'Failed to delete file' });
  }
} 