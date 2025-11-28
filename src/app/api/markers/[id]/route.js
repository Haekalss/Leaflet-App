import clientPromise from '../../../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export async function PUT(request, context) {
  try {
    const params = await context.params;
    const body = await request.json();
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || 'leafletapp');
    
    const result = await db.collection('markers').updateOne(
      { _id: new ObjectId(params.id) },
      { 
        $set: {
          title: body.title,
          description: body.description || '',
          updatedAt: new Date()
        }
      }
    );
    
    if (result.matchedCount === 0) {
      return Response.json({ error: 'Marker not found' }, { status: 404 });
    }
    
    return Response.json({ success: true });
  } catch (error) {
    console.error('Error updating marker:', error);
    return Response.json({ error: 'Failed to update marker' }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    const params = await context.params;
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || 'leafletapp');
    
    const result = await db.collection('markers').deleteOne({ _id: new ObjectId(params.id) });
    
    if (result.deletedCount === 0) {
      return Response.json({ error: 'Marker not found' }, { status: 404 });
    }
    
    return Response.json({ success: true });
  } catch (error) {
    console.error('Error deleting marker:', error);
    return Response.json({ error: 'Failed to delete marker' }, { status: 500 });
  }
}