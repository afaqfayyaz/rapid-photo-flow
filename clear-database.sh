#!/bin/bash

echo "🗑️  Clearing RapidPhotoFlow Database..."
echo ""

# Clear photos
echo "Clearing photos..."
docker exec rapidphotoflow-mongodb mongosh rapidphotodb --eval "db.photos.deleteMany({})" --quiet

# Clear events
echo "Clearing events..."
docker exec rapidphotoflow-mongodb mongosh rapidphotodb --eval "db.photo_events.deleteMany({})" --quiet

# Show counts
PHOTO_COUNT=$(docker exec rapidphotoflow-mongodb mongosh rapidphotodb --eval "db.photos.countDocuments()" --quiet)
EVENT_COUNT=$(docker exec rapidphotoflow-mongodb mongosh rapidphotodb --eval "db.photo_events.countDocuments()" --quiet)

echo ""
echo "✅ Database cleared!"
echo "   Photos: $PHOTO_COUNT"
echo "   Events: $EVENT_COUNT"
echo ""
echo "Note: This only clears MongoDB. Cloudinary images are not deleted."
echo "      To delete Cloudinary images, use the delete button in the UI."

