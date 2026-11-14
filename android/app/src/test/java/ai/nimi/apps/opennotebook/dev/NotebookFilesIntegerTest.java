package ai.nimi.apps.opennotebook.dev;
import org.junit.Test;
import static org.junit.Assert.*;

public class NotebookFilesIntegerTest {
    @Test public void acceptsTranscriptCharsetWithoutChangingTheFileType() {
        assertEquals("text/plain", NotebookFilesPlugin.documentMime("text/plain;charset=utf-8"));
        assertEquals("audio/wav", NotebookFilesPlugin.documentMime("Audio/WAV"));
        for (String value : new String[] { "plain", "text/plain\r\nx: y", "text/", "" }) {
            try { NotebookFilesPlugin.documentMime(value); fail("Accepted invalid MIME: " + value); }
            catch (IllegalArgumentException expected) { }
        }
    }
    @Test public void acceptsJsonIntegerAndLongWithoutTruncatingFourGiB() {
        assertEquals(0L, NotebookFilesPlugin.exactInteger(Integer.valueOf(0)));
        assertEquals(65536L, NotebookFilesPlugin.exactInteger(Integer.valueOf(65536)));
        assertEquals(4294967296L, NotebookFilesPlugin.exactInteger(Long.valueOf(4294967296L)));
        assertEquals(9007199254740991L, NotebookFilesPlugin.exactInteger(Long.valueOf(9007199254740991L)));
    }
    @Test public void rejectsCoercionFractionsNegativeAndUnsafeNumbers() {
        for (Object value : new Object[] { null, "65536", Double.valueOf(1.5), Double.valueOf(1.0), Integer.valueOf(-1), Long.valueOf(9007199254740992L) }) {
            try { NotebookFilesPlugin.exactInteger(value); fail("Accepted invalid offset: " + value); }
            catch (IllegalArgumentException expected) { }
        }
    }
}
