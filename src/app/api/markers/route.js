import clientPromise from '../../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || 'leafletapp');
    const markers = await db.collection('markers').find({}).toArray();
    return Response.json(markers);
  } catch (error) {
    return Response.json({ error: 'Failed to fetch markers' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || 'leafletapp');
    
    const newMarker = {
      lat: body.lat,
      lng: body.lng,
      title: body.title,
      description: body.description || '',
      createdAt: new Date()
    };
    
    const result = await db.collection('markers').insertOne(newMarker);
    return Response.json({ ...newMarker, _id: result.insertedId }, { status: 201 });
  } catch (error) {
    return Response.json({ error: 'Failed to create marker' }, { status: 500 });
  }
}